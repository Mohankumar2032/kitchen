import { promises as fs } from "fs";
import path from "path";
import { del, get, list, put } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import type {
  CategoryDef,
  CheckoutPayload,
  Database,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductUpdate,
  Settings,
} from "./types";
import {
  CATEGORY_META,
  DEFAULT_SETTINGS,
  allCategoryDefs,
  categoryLabel,
  computeShipping,
  enrichOrderItemCosts,
  getChildCategories,
  getLeafCategories,
  getParentCategories,
  isValidUtr,
  normalizeUtr,
  resolveCategorySlug,
  slugifyCategory,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const LEGACY_DB_PATH = path.join(DATA_DIR, "db.json");
const CATALOG_PATH = path.join(DATA_DIR, "catalog.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");

const BLOB_LEGACY_PATH = "kitchen/db.json";
const BLOB_CATALOG_PATH = "kitchen/catalog.json";
const BLOB_ORDERS_PATH = "kitchen/orders.json";
const BLOB_PRODUCTS_PREFIX = "kitchen/products/";
/** Per-order docs — survives orders.json read lag / races on Blob. */
const BLOB_ORDER_DOCS_PREFIX = "kitchen/order-docs/";

const MAX_WRITE_RETRIES = 8;

interface CatalogStore {
  version: number;
  settings: Settings;
  categories?: CategoryDef[];
  products: Product[];
}

interface OrdersStore {
  version: number;
  orders: Order[];
  enquiries: EnquiryLike[];
}

type EnquiryLike = Database["enquiries"][number];

interface BlobJsonRead<T> {
  value: T;
  etag: string | null;
}

interface KitchenDbGlobal {
  __kitchenCachedDb?: Database | null;
  __kitchenPendingDbRead?: Promise<Database> | null;
  __kitchenPendingDbReadId?: number;
  __kitchenCatalogMtimeMs?: number;
  __kitchenCatalogWriteChain?: Promise<void>;
  __kitchenCatalogEtag?: string | null;
  __kitchenOrdersEtag?: string | null;
}

const dbGlobal = globalThis as typeof globalThis & KitchenDbGlobal;

function getCachedDb(): Database | null {
  return dbGlobal.__kitchenCachedDb ?? null;
}

function setCachedDb(db: Database | null): void {
  dbGlobal.__kitchenCachedDb = db;
}

function getPendingDbRead(): Promise<Database> | null {
  return dbGlobal.__kitchenPendingDbRead ?? null;
}

function setPendingDbRead(pending: Promise<Database> | null): void {
  dbGlobal.__kitchenPendingDbRead = pending;
}

function nextPendingReadId(): number {
  const id = (dbGlobal.__kitchenPendingDbReadId ?? 0) + 1;
  dbGlobal.__kitchenPendingDbReadId = id;
  return id;
}

/** Blob get() returns weak ETags (W/"..."); normalize when storing. */
function toStrongEtag(etag: string | null | undefined): string | null {
  if (!etag) return null;
  return etag.replace(/^W\//, "");
}

/** Serialize catalog mutations in this process so local writes cannot clobber each other. */
function withCatalogLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = dbGlobal.__kitchenCatalogWriteChain ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  dbGlobal.__kitchenCatalogWriteChain = prev.then(() => gate, () => gate);

  return prev
    .catch(() => undefined)
    .then(fn)
    .finally(() => {
      release();
    });
}

function shouldUseBlobDb(): boolean {
  return Boolean(
    process.env.VERCEL &&
      (process.env.BLOB_READ_WRITE_TOKEN ||
        process.env.BLOB_STORE_ID ||
        process.env.VERCEL_OIDC_TOKEN)
  );
}

function blobOpts() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? { token: process.env.BLOB_READ_WRITE_TOKEN }
    : {};
}

function emptyCatalog(): CatalogStore {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    categories: [],
    products: [],
  };
}

function normalizeSettings(settings: Partial<Settings> | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
    shippingFee:
      typeof settings?.shippingFee === "number"
        ? Math.max(0, settings.shippingFee)
        : DEFAULT_SETTINGS.shippingFee,
    freeShippingAbove:
      typeof settings?.freeShippingAbove === "number"
        ? Math.max(0, settings.freeShippingAbove)
        : DEFAULT_SETTINGS.freeShippingAbove,
    upiId: (settings?.upiId || DEFAULT_SETTINGS.upiId).trim(),
    upiMobile: (settings?.upiMobile || DEFAULT_SETTINGS.upiMobile).trim(),
    upiPayee: (settings?.upiPayee || DEFAULT_SETTINGS.upiPayee).trim(),
  };
}

function normalizeOrder(order: Order): Order {
  const subtotal = Number(order.subtotal) || 0;
  const shipping =
    typeof order.shipping === "number"
      ? Math.max(0, order.shipping)
      : computeShipping(subtotal, DEFAULT_SETTINGS);
  const total =
    typeof order.total === "number" ? Math.max(0, order.total) : subtotal + shipping;
  const paymentStatus: PaymentStatus =
    order.paymentStatus === "submitted" || order.paymentStatus === "verified"
      ? order.paymentStatus
      : "unpaid";

  return {
    ...order,
    subtotal,
    shipping,
    total,
    paymentStatus,
    utr: order.utr ? normalizeUtr(order.utr) : null,
    utrSubmittedAt: order.utrSubmittedAt ?? null,
  };
}

function emptyOrders(): OrdersStore {
  return {
    version: 1,
    orders: [],
    enquiries: [],
  };
}

function composeDb(catalog: CatalogStore, orders: OrdersStore): Database {
  return {
    version: catalog.version,
    settings: catalog.settings,
    categories: catalog.categories ?? [],
    products: catalog.products,
    orders: orders.orders,
    enquiries: orders.enquiries,
  };
}

function splitDb(db: Database): { catalog: CatalogStore; orders: OrdersStore } {
  return {
    catalog: {
      version: db.version ?? 1,
      settings: db.settings,
      categories: db.categories ?? [],
      products: db.products,
    },
    orders: {
      version: db.ordersVersion ?? 1,
      orders: db.orders,
      enquiries: db.enquiries,
    },
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Read JSON from Blob. Prefer put URL fetch when available — get() can lag after writes. */
async function readBlobJson<T>(blobPath: string): Promise<BlobJsonRead<T> | null> {
  try {
    const result = await get(blobPath, {
      access: "public",
      useCache: false,
      ...blobOpts(),
    });
    if (result && result.statusCode === 200 && result.stream) {
      const text = await new Response(result.stream).text();
      return {
        value: JSON.parse(text) as T,
        etag: toStrongEtag(result.blob.etag),
      };
    }
  } catch {
    // fall through to list + URL fetch
  }

  // get() occasionally lags right after put(); list URL + no-store fetch is fresher.
  try {
    const listed = await list({
      prefix: blobPath,
      limit: 10,
      ...blobOpts(),
    });
    const blob = listed.blobs.find((b) => b.pathname === blobPath);
    if (!blob?.url) return null;
    const res = await fetch(`${blob.url}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return {
      value: (await res.json()) as T,
      etag: toStrongEtag(blob.etag),
    };
  } catch {
    return null;
  }
}

async function writeBlobJson(
  blobPath: string,
  value: unknown
): Promise<string | null> {
  const result = await put(blobPath, JSON.stringify(value, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    ...blobOpts(),
  });
  return toStrongEtag(result.etag);
}

function productBlobPath(id: string): string {
  return `${BLOB_PRODUCTS_PREFIX}${id}.json`;
}

/** Durable per-product document — survives catalog index races on Blob. */
async function writeProductBlob(product: Product): Promise<void> {
  if (!shouldUseBlobDb()) return;
  await writeBlobJson(productBlobPath(product.id), product);
}

async function readProductBlob(id: string): Promise<Product | null> {
  if (!shouldUseBlobDb()) return null;
  const read = await readBlobJson<Product>(productBlobPath(id));
  return read?.value ?? null;
}

async function deleteProductBlob(id: string): Promise<void> {
  if (!shouldUseBlobDb()) return;
  try {
    await del(productBlobPath(id), blobOpts());
  } catch {
    // Blob may already be gone; catalog removal is the source of truth.
  }
}

function orderDocBlobPath(id: string): string {
  return `${BLOB_ORDER_DOCS_PREFIX}${id}.json`;
}

/** Durable per-order document — survives orders.json get() lag after writes. */
async function writeOrderBlob(order: Order): Promise<void> {
  if (!shouldUseBlobDb()) return;
  await writeBlobJson(orderDocBlobPath(order.id), order);
}

async function readOrderBlob(id: string): Promise<Order | null> {
  if (!shouldUseBlobDb()) return null;
  const read = await readBlobJson<Order>(orderDocBlobPath(id));
  return read?.value ?? null;
}

/**
 * Merge any product documents under kitchen/products/ into the catalog index.
 * This recovers products lost when concurrent catalog overwrites race.
 */
async function mergeProductBlobs(catalog: CatalogStore): Promise<CatalogStore> {
  if (!shouldUseBlobDb()) return catalog;

  try {
    const listed = await list({
      prefix: BLOB_PRODUCTS_PREFIX,
      ...blobOpts(),
    });
    if (!listed.blobs.length) return catalog;

    const byId = new Map(catalog.products.map((p) => [p.id, p]));
    let changed = false;

    await Promise.all(
      listed.blobs.map(async (blob) => {
        const file = blob.pathname.split("/").pop() || "";
        if (!file.endsWith(".json")) return;
        const id = file.slice(0, -".json".length);
        if (!id || byId.has(id)) return;
        try {
          const res = await fetch(`${blob.url}?t=${Date.now()}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const product = (await res.json()) as Product;
          if (!product?.id || product.id !== id) return;
          byId.set(id, product);
          changed = true;
        } catch {
          // skip unreadable product blob
        }
      })
    );

    if (!changed) return catalog;

    const products = Array.from(byId.values()).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );
    return { ...catalog, products };
  } catch (error) {
    console.error("mergeProductBlobs failed", error);
    return catalog;
  }
}

async function readSeedLegacy(): Promise<Database> {
  const raw = await fs.readFile(LEGACY_DB_PATH, "utf8");
  return JSON.parse(raw) as Database;
}

async function migrateFromLegacy(db: Database): Promise<{
  catalog: CatalogStore;
  orders: OrdersStore;
}> {
  const split = splitDb({
    ...db,
    version: db.version ?? 1,
    ordersVersion: db.ordersVersion ?? 1,
  });
  return split;
}

async function loadCatalogAndOrders(): Promise<{
  catalog: CatalogStore;
  orders: OrdersStore;
}> {
  if (shouldUseBlobDb()) {
    const [catalogRead, ordersRead] = await Promise.all([
      readBlobJson<CatalogStore>(BLOB_CATALOG_PATH),
      readBlobJson<OrdersStore>(BLOB_ORDERS_PATH),
    ]);

    dbGlobal.__kitchenCatalogEtag = catalogRead?.etag ?? null;
    dbGlobal.__kitchenOrdersEtag = ordersRead?.etag ?? null;

    if (catalogRead && ordersRead) {
      return { catalog: catalogRead.value, orders: ordersRead.value };
    }

    const legacyRead = await readBlobJson<Database>(BLOB_LEGACY_PATH);
    if (legacyRead) {
      const migrated = await migrateFromLegacy(normalizeDb(legacyRead.value));
      const [catalogEtag, ordersEtag] = await Promise.all([
        writeBlobJson(BLOB_CATALOG_PATH, migrated.catalog),
        writeBlobJson(BLOB_ORDERS_PATH, migrated.orders),
      ]);
      dbGlobal.__kitchenCatalogEtag = catalogEtag;
      dbGlobal.__kitchenOrdersEtag = ordersEtag;
      return migrated;
    }

    if (catalogRead && !ordersRead) {
      const nextOrders = emptyOrders();
      const ordersEtag = await writeBlobJson(BLOB_ORDERS_PATH, nextOrders);
      dbGlobal.__kitchenOrdersEtag = ordersEtag;
      return { catalog: catalogRead.value, orders: nextOrders };
    }

    const seed = normalizeDb(await readSeedLegacy());
    const migrated = await migrateFromLegacy(seed);
    const [catalogEtag, ordersEtag] = await Promise.all([
      writeBlobJson(BLOB_CATALOG_PATH, migrated.catalog),
      writeBlobJson(BLOB_ORDERS_PATH, migrated.orders),
    ]);
    dbGlobal.__kitchenCatalogEtag = catalogEtag;
    dbGlobal.__kitchenOrdersEtag = ordersEtag;
    return migrated;
  }

  const [catalog, orders, legacy] = await Promise.all([
    readJsonFile<CatalogStore>(CATALOG_PATH),
    readJsonFile<OrdersStore>(ORDERS_PATH),
    readJsonFile<Database>(LEGACY_DB_PATH),
  ]);

  dbGlobal.__kitchenCatalogEtag = null;
  dbGlobal.__kitchenOrdersEtag = null;

  if (catalog && orders) return { catalog, orders };

  if (legacy) {
    const migrated = await migrateFromLegacy(normalizeDb(legacy));
    await fs.mkdir(DATA_DIR, { recursive: true });
    await Promise.all([
      fs.writeFile(CATALOG_PATH, JSON.stringify(migrated.catalog, null, 2), "utf8"),
      fs.writeFile(ORDERS_PATH, JSON.stringify(migrated.orders, null, 2), "utf8"),
    ]);
    return migrated;
  }

  return { catalog: emptyCatalog(), orders: emptyOrders() };
}

/**
 * Seed catalog PNGs were optimized to WebP. Production Blob may still
 * reference the deleted .png paths — rewrite them on read.
 */
function normalizeCatalogImagePath(url: string): string {
  if (
    url.startsWith("/products/catalog/") &&
    (url.endsWith(".png") || url.endsWith(".PNG"))
  ) {
    return `${url.slice(0, -4)}.webp`;
  }
  return url;
}

function normalizeDb(db: Database): Database {
  if (!Array.isArray(db.categories)) db.categories = [];
  if (!Array.isArray(db.products)) db.products = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  if (!Array.isArray(db.enquiries)) db.enquiries = [];
  if (typeof db.version !== "number") db.version = 1;
  if (typeof db.ordersVersion !== "number") db.ordersVersion = 1;

  db.settings = normalizeSettings(db.settings);

  db.categories = db.categories.map((category) => ({
    ...category,
    slug: resolveCategorySlug(category.slug),
    parent: category.parent ?? null,
  }));

  db.products = db.products.map((product) => ({
    ...product,
    category: resolveCategorySlug(product.category),
    images: (product.images || []).map(normalizeCatalogImagePath),
  }));

  db.orders = db.orders.map((order) => normalizeOrder(order));

  return db;
}

function cloneDb(db: Database): Database {
  return structuredClone(db);
}

async function loadDb(): Promise<Database> {
  const { catalog, orders } = await loadCatalogAndOrders();
  // Normalize in memory only — never write on read (that races with creates on Blob).
  return normalizeDb(composeDb(catalog, orders));
}

async function catalogFileMtimeMs(): Promise<number> {
  try {
    const stat = await fs.stat(CATALOG_PATH);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

async function startFreshDbLoad(): Promise<Database> {
  // Drop any in-flight load so callers never join a stale pre-write snapshot.
  setCachedDb(null);
  const readId = nextPendingReadId();
  const pending = loadDb()
    .then(async (db) => {
      // Ignore results from superseded loads.
      if (dbGlobal.__kitchenPendingDbReadId !== readId) return db;
      setCachedDb(cloneDb(db));
      if (!shouldUseBlobDb()) {
        dbGlobal.__kitchenCatalogMtimeMs = await catalogFileMtimeMs();
      }
      return db;
    })
    .finally(() => {
      if (dbGlobal.__kitchenPendingDbReadId === readId) {
        setPendingDbRead(null);
      }
    });
  setPendingDbRead(pending);
  return cloneDb(await pending);
}

/** Always read latest catalog/orders from disk or Blob (bypass memory cache). */
async function readDbFresh(): Promise<Database> {
  return startFreshDbLoad();
}

export async function readDb(): Promise<Database> {
  // Local disk: detect writes from other module instances / processes.
  if (!shouldUseBlobDb()) {
    const mtime = await catalogFileMtimeMs();
    const cached = getCachedDb();
    if (cached && dbGlobal.__kitchenCatalogMtimeMs === mtime) {
      return cloneDb(cached);
    }
  } else {
    // Blob is shared across lambdas; never reuse process memory here —
    // another instance may have written a newer catalog.json.
  }

  const existingPending = getPendingDbRead();
  if (existingPending) return cloneDb(await existingPending);

  return startFreshDbLoad();
}

function invalidateCatalogCache(): void {
  try {
    // Storefront "use cache" entries
    revalidateTag("catalog", "max");
    // Admin pages under cacheComponents
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/products");
    revalidatePath("/admin/orders");
  } catch {
    // Cache APIs are a no-op outside a Next.js request context
  }
}

function invalidateOrderPage(orderId: string): void {
  try {
    revalidatePath(`/order/${orderId}`);
    revalidatePath("/admin/orders");
  } catch {
    // Cache APIs are a no-op outside a Next.js request context
  }
}

async function persistSplit(
  next: Database,
  options: { catalogChanged?: boolean; ordersChanged?: boolean } = {}
): Promise<void> {
  const catalogChanged = options.catalogChanged ?? true;
  const ordersChanged = options.ordersChanged ?? true;
  const { catalog, orders } = splitDb(next);

  if (shouldUseBlobDb()) {
    if (catalogChanged && ordersChanged) {
      const [nextCatalogEtag, nextOrdersEtag] = await Promise.all([
        writeBlobJson(BLOB_CATALOG_PATH, catalog),
        writeBlobJson(BLOB_ORDERS_PATH, orders),
      ]);
      dbGlobal.__kitchenCatalogEtag = nextCatalogEtag;
      dbGlobal.__kitchenOrdersEtag = nextOrdersEtag;
    } else if (catalogChanged) {
      dbGlobal.__kitchenCatalogEtag = await writeBlobJson(
        BLOB_CATALOG_PATH,
        catalog
      );
    } else if (ordersChanged) {
      dbGlobal.__kitchenOrdersEtag = await writeBlobJson(
        BLOB_ORDERS_PATH,
        orders
      );
    }
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const writes: Promise<void>[] = [];
    if (catalogChanged) {
      writes.push(
        fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf8")
      );
    }
    if (ordersChanged) {
      writes.push(
        fs.writeFile(ORDERS_PATH, JSON.stringify(orders, null, 2), "utf8")
      );
    }
    await Promise.all(writes);
  }

  setCachedDb(cloneDb(next));
  if (!shouldUseBlobDb()) {
    dbGlobal.__kitchenCatalogMtimeMs = await catalogFileMtimeMs();
  }
  // Invalidate any in-flight read so it cannot replace this fresher snapshot.
  nextPendingReadId();
  setPendingDbRead(null);

  if (catalogChanged) invalidateCatalogCache();
}

export async function writeDb(db: Database): Promise<void> {
  const next = normalizeDb(db);
  next.version = (next.version ?? 1) + 1;
  next.ordersVersion = (next.ordersVersion ?? 1) + 1;
  await persistSplit(next, { catalogChanged: true, ordersChanged: true });
}

async function writeCatalogDb(db: Database): Promise<void> {
  const next = normalizeDb(db);
  next.version = (next.version ?? 1) + 1;
  await persistSplit(next, { catalogChanged: true, ordersChanged: false });
}

async function writeOrdersDb(db: Database): Promise<void> {
  const next = normalizeDb(db);
  next.ordersVersion = (next.ordersVersion ?? 1) + 1;
  await persistSplit(next, { catalogChanged: false, ordersChanged: true });
}

export async function listCategoryOptions(): Promise<CategoryDef[]> {
  const db = await readDb();
  const map = new Map<string, CategoryDef>();

  for (const item of allCategoryDefs(db.categories)) {
    map.set(item.slug, item);
  }

  for (const product of db.products) {
    const slug = resolveCategorySlug(product.category);
    if (map.has(slug)) continue;
    map.set(slug, {
      slug,
      label: categoryLabel(slug, db.categories),
      icon: "fa-tag",
      blurb: "Browse products",
      parent: null,
    });
  }

  const parents = [...map.values()]
    .filter((c) => !c.parent)
    .sort((a, b) => a.label.localeCompare(b.label));
  const ordered: CategoryDef[] = [];
  for (const parent of parents) {
    ordered.push(parent);
    const children = [...map.values()]
      .filter((c) => c.parent === parent.slug)
      .sort((a, b) => a.label.localeCompare(b.label));
    ordered.push(...children);
  }
  for (const item of map.values()) {
    if (item.parent && !map.has(item.parent) && !ordered.includes(item)) {
      ordered.push(item);
    }
  }
  return ordered;
}

export async function listParentCategories(): Promise<CategoryDef[]> {
  const categories = await listCategoryOptions();
  return getParentCategories(categories);
}

export async function listLeafCategories(): Promise<CategoryDef[]> {
  const categories = await listCategoryOptions();
  return getLeafCategories(categories);
}

export async function ensureCategory(
  labelOrSlug: string,
  label?: string,
  parent?: string | null
): Promise<CategoryDef> {
  return withCatalogLock(async () => {
    const db = await readDbFresh();
    const rawLabel = (label || labelOrSlug).trim();
    if (!rawLabel) throw new Error("Category name is required");

    let slug = slugifyCategory(label ? labelOrSlug : rawLabel);
    if (!slug) slug = `category-${Date.now().toString(36)}`;
    slug = resolveCategorySlug(slug);

    const parentSlug = parent ? resolveCategorySlug(parent) : null;
    if (parentSlug) {
      const parents = allCategoryDefs(db.categories);
      const parentExists = parents.some(
        (c) => c.slug === parentSlug && !c.parent
      );
      if (!parentExists) throw new Error("Invalid parent category");
    }

    const existing =
      (db.categories ?? []).find((c) => c.slug === slug) ||
      (CATEGORY_META[slug]
        ? {
            slug,
            label: CATEGORY_META[slug].label,
            icon: CATEGORY_META[slug].icon,
            blurb: CATEGORY_META[slug].blurb,
            parent: CATEGORY_META[slug].parent ?? null,
          }
        : null);

    if (existing) return existing;

    const created: CategoryDef = {
      slug,
      label: rawLabel,
      icon: "fa-tag",
      blurb: "Browse products",
      parent: parentSlug,
    };
    db.categories = [...(db.categories ?? []), created];
    await writeCatalogDb(db);
    return created;
  });
}

export async function getSettings(): Promise<Settings> {
  const db = await readDb();
  return db.settings;
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  return withCatalogLock(async () => {
    const db = await readDbFresh();
    db.settings = { ...db.settings, ...patch };
    await writeCatalogDb(db);
    return db.settings;
  });
}

export async function listProducts(): Promise<Product[]> {
  const db = await readDb();
  return db.products;
}

export async function listActiveProducts(): Promise<Product[]> {
  const db = await readDb();
  return db.products.filter((p) => p.status === "active");
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await readDb();
  return db.products.find((p) => p.id === id) ?? null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = await readDb();
  return db.products.find((p) => p.slug === slug) ?? null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type ProductCreateInput = {
  name: string;
  category: string;
  categoryLabel?: string;
  type?: Product["type"];
  status?: Product["status"];
  description?: string;
  images?: string[];
  imageVariants?: Product["imageVariants"];
  cost?: number;
  sellPrice?: number;
  mrp?: number;
  platformPrice?: number;
  platformName?: string;
  platformUrl?: string;
  stock?: number;
  commissionPercent?: number | null;
};

export async function createProduct(
  input: ProductCreateInput
): Promise<Product> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const productId = `p-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  return withCatalogLock(async () => {
    const db = await readDbFresh();

    const already = db.products.find((p) => p.id === productId);
    if (already) return already;

    let category = resolveCategorySlug(input.category.trim());
    if (input.categoryLabel?.trim()) {
      const rawLabel = input.categoryLabel.trim();
      let slug = resolveCategorySlug(category || rawLabel);
      if (!slug) slug = `category-${Date.now().toString(36)}`;
      const existing =
        (db.categories ?? []).find((c) => c.slug === slug) ||
        (CATEGORY_META[slug]
          ? {
              slug,
              label: CATEGORY_META[slug].label,
              icon: CATEGORY_META[slug].icon,
              blurb: CATEGORY_META[slug].blurb,
              parent: CATEGORY_META[slug].parent ?? null,
            }
          : null);
      if (existing) {
        category = existing.slug;
      } else {
        const created: CategoryDef = {
          slug,
          label: rawLabel,
          icon: "fa-tag",
          blurb: "Browse products",
          parent: null,
        };
        db.categories = [...(db.categories ?? []), created];
        category = created.slug;
      }
    } else if (category && !CATEGORY_META[category]) {
      const existing = (db.categories ?? []).find((c) => c.slug === category);
      if (!existing) {
        db.categories = [
          ...(db.categories ?? []),
          {
            slug: category,
            label: categoryLabel(category),
            icon: "fa-tag",
            blurb: "Browse products",
            parent: null,
          },
        ];
      }
    }
    if (!category) throw new Error("Category is required");

    const leaves = getLeafCategories(db.categories);
    const parents = getParentCategories(db.categories);
    const isLeaf = leaves.some((c) => c.slug === category);
    const isParentOnly = parents.some(
      (c) =>
        c.slug === category &&
        getChildCategories(c.slug, db.categories).length > 0
    );
    if (!isLeaf || isParentOnly) {
      throw new Error("Pick a subcategory (not a parent category)");
    }

    let slug = slugify(name) || `product-${Date.now()}`;
    const slugTaken = db.products.some(
      (p) => p.slug === slug && p.id !== productId
    );
    if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const product: Product = {
      id: productId,
      name,
      slug,
      category,
      type: input.type === "pack" ? "pack" : "product",
      status: input.status === "inactive" ? "inactive" : "active",
      description: (input.description || "").trim(),
      images: input.images?.length
        ? input.images
        : ["/products/appliance.svg"],
      imageVariants: input.imageVariants,
      cost: Number(input.cost) || 0,
      sellPrice: Number(input.sellPrice) || 0,
      mrp: input.mrp != null && input.mrp > 0 ? Number(input.mrp) : undefined,
      platformPrice: Number(input.platformPrice) || 0,
      platformName: (input.platformName || "Meesho").trim() || "Meesho",
      platformUrl: (input.platformUrl || "").trim(),
      stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
      commissionPercent:
        input.commissionPercent === undefined ||
        input.commissionPercent === null
          ? null
          : Math.min(100, Math.max(0, Number(input.commissionPercent) || 0)),
      createdAt,
      updatedAt: createdAt,
    };

    // 1) Durable product document first (unique path — no catalog race).
    await writeProductBlob(product);

    // 2) Refresh catalog index (best-effort merge so concurrent creates survive).
    const latest = await readDbFresh();
    const recoveredCatalog = await mergeProductBlobs(splitDb(latest).catalog);
    const byId = new Map(recoveredCatalog.products.map((p) => [p.id, p]));
    byId.set(product.id, product);
    latest.products = Array.from(byId.values()).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );
    latest.categories = db.categories;
    await writeCatalogDb(latest);

    return product;
  });
}

export async function updateProduct(
  id: string,
  patch: ProductUpdate
): Promise<Product | null> {
  return withCatalogLock(async () => {
    const db = await readDbFresh();
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) {
      const fromBlob = await readProductBlob(id);
      if (!fromBlob) return null;
      const next = {
        ...fromBlob,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await writeProductBlob(next);
      db.products.unshift(next);
      await writeCatalogDb(db);
      return next;
    }

    const next: Product = {
      ...db.products[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    db.products[index] = next;
    await writeProductBlob(next);
    await writeCatalogDb(db);
    return next;
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  return withCatalogLock(async () => {
    const db = await readDbFresh();
    const index = db.products.findIndex((p) => p.id === id);
    const hadBlob = Boolean(await readProductBlob(id));

    if (index === -1 && !hadBlob) return false;

    if (index !== -1) {
      db.products.splice(index, 1);
      await writeCatalogDb(db);
    }

    await deleteProductBlob(id);
    return true;
  });
}

export async function listOrders(): Promise<Order[]> {
  const db = await readDb();
  const costByProductId = new Map(
    db.products.map((p) => [p.id, Number(p.cost) || 0])
  );
  const orders = enrichOrderItemCosts(db.orders, costByProductId);
  return [...orders].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export async function getOrderById(id: string): Promise<Order | null> {
  // Fresh read + per-order blob fallback: Vercel Blob get() can lag after put().
  let order: Order | null = null;
  let products: Product[] = [];

  for (let attempt = 0; attempt < 4; attempt++) {
    const db = await readDbFresh();
    products = db.products;
    order = db.orders.find((o) => o.id === id) ?? null;
    if (!order) order = await readOrderBlob(id);
    if (order) break;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }

  if (!order) return null;

  const costByProductId = new Map(
    products.map((p) => [p.id, Number(p.cost) || 0])
  );
  return enrichOrderItemCosts([order], costByProductId)[0] ?? null;
}

export async function createOrder(payload: CheckoutPayload): Promise<Order> {
  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
    setCachedDb(null);
    const db = await readDb();
    const expectedCatalogVersion = db.version ?? 1;
    const expectedOrdersVersion = db.ordersVersion ?? 1;

    if (!payload.items?.length) {
      throw new Error("Cart is empty");
    }

    const items = payload.items.map((line) => {
      const product = db.products.find((p) => p.id === line.productId);
      if (!product || product.status !== "active") {
        throw new Error(`Product unavailable: ${line.productId}`);
      }
      const qty = Math.max(1, Math.floor(line.qty));
      if (product.stock < qty) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      return { product, qty };
    });

    for (const { product, qty } of items) {
      product.stock -= qty;
      product.updatedAt = new Date().toISOString();
    }

    const orderItems = items.map(({ product, qty }) => ({
      productId: product.id,
      productName: product.name,
      qty,
      sellPrice: product.sellPrice,
      cost: Number(product.cost) || 0,
      platformName: product.platformName,
      platformUrl: product.platformUrl,
    }));

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.sellPrice * item.qty,
      0
    );
    const settings = normalizeSettings(db.settings);
    const shipping = computeShipping(subtotal, settings);
    const total = subtotal + shipping;

    if (!isValidUtr(payload.utr || "")) {
      throw new Error("Pay via UPI and enter a valid UTR before placing the order");
    }
    const utr = normalizeUtr(payload.utr);
    const createdAt = new Date().toISOString();

    const order: Order = {
      id: `ord-${Date.now().toString(36)}`,
      items: orderItems,
      subtotal,
      shipping,
      total,
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone.trim(),
      customerEmail: (payload.customerEmail || "").trim(),
      addressLine1: payload.addressLine1.trim(),
      addressLine2: (payload.addressLine2 || "").trim(),
      city: payload.city.trim(),
      state: payload.state.trim(),
      pincode: payload.pincode.trim(),
      notes: (payload.notes || "").trim(),
      status: "new",
      paymentStatus: "submitted",
      utr,
      utrSubmittedAt: createdAt,
      createdAt,
    };

    db.orders.unshift(order);

    const latest = await loadDb();
    if (
      (latest.version ?? 1) !== expectedCatalogVersion ||
      (latest.ordersVersion ?? 1) !== expectedOrdersVersion
    ) {
      continue;
    }

    db.version = expectedCatalogVersion;
    db.ordersVersion = expectedOrdersVersion;
    // Write durable order doc first so /order/[id] can resolve even if
    // orders.json reads briefly lag behind the put().
    await writeOrderBlob(order);
    await writeDb(db);
    invalidateOrderPage(order.id);
    return order;
  }

  throw new Error("Could not place order due to concurrent updates");
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  return updateOrder(id, { status });
}

export async function updateOrder(
  id: string,
  patch: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    utr?: string | null;
  }
): Promise<Order | null> {
  const db = await readDb();
  const index = db.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  const current = normalizeOrder(db.orders[index]);
  const next: Order = { ...current };

  if (patch.status) next.status = patch.status;

  if (patch.paymentStatus) {
    next.paymentStatus = patch.paymentStatus;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "utr")) {
    if (current.paymentStatus === "verified") {
      throw new Error("Payment already verified; UTR cannot be changed");
    }
    const raw = (patch.utr || "").trim();
    if (!raw) {
      next.utr = null;
      next.utrSubmittedAt = null;
      next.paymentStatus = "unpaid";
    } else {
      if (!isValidUtr(raw)) {
        throw new Error("UTR must be 8–22 letters/numbers (no spaces)");
      }
      next.utr = normalizeUtr(raw);
      next.utrSubmittedAt = new Date().toISOString();
      if (next.paymentStatus === "unpaid") next.paymentStatus = "submitted";
    }
  }

  db.orders[index] = next;
  await writeOrderBlob(next);
  await writeOrdersDb(db);
  invalidateOrderPage(next.id);
  return db.orders[index];
}

export async function getCounts() {
  const db = await readDb();
  return {
    products: db.products.length,
    packs: db.products.filter((p) => p.type === "pack").length,
    onlyProducts: db.products.filter((p) => p.type === "product").length,
    orders: db.orders.length,
    ordersNew: db.orders.filter((o) => o.status === "new").length,
    ordersNeedsVerify: db.orders.filter(
      (o) => (o.paymentStatus || "unpaid") === "submitted"
    ).length,
    enquiriesNew: db.enquiries.filter((e) => e.status === "new").length,
  };
}

export function getCategories(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.category))].sort();
}
