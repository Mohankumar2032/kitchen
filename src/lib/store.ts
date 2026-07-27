import { promises as fs } from "fs";
import path from "path";
import { head, put } from "@vercel/blob";
import { revalidateTag } from "next/cache";
import type {
  CategoryDef,
  CheckoutPayload,
  Database,
  Order,
  OrderStatus,
  Product,
  ProductUpdate,
  Settings,
} from "./types";
import {
  CATEGORY_META,
  CATEGORY_TREE,
  allCategoryDefs,
  categoryLabel,
  getChildCategories,
  getLeafCategories,
  getParentCategories,
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

const MAX_WRITE_RETRIES = 3;

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

let cachedDb: Database | null = null;
let pendingDbRead: Promise<Database> | null = null;

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
    settings: {
      defaultCommissionPercent: 10,
      storeName: "Kitchen",
      currency: "INR",
    },
    categories: [],
    products: [],
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

async function readBlobJson<T>(blobPath: string): Promise<T | null> {
  try {
    const meta = await head(blobPath, blobOpts());
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function writeBlobJson(blobPath: string, value: unknown): Promise<void> {
  await put(blobPath, JSON.stringify(value, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    ...blobOpts(),
  });
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
    const [catalog, orders, legacy] = await Promise.all([
      readBlobJson<CatalogStore>(BLOB_CATALOG_PATH),
      readBlobJson<OrdersStore>(BLOB_ORDERS_PATH),
      readBlobJson<Database>(BLOB_LEGACY_PATH),
    ]);

    if (catalog && orders) return { catalog, orders };

    if (legacy) {
      const migrated = await migrateFromLegacy(normalizeDb(legacy));
      await Promise.all([
        writeBlobJson(BLOB_CATALOG_PATH, migrated.catalog),
        writeBlobJson(BLOB_ORDERS_PATH, migrated.orders),
      ]);
      return migrated;
    }

    if (catalog && !orders) {
      const nextOrders = emptyOrders();
      await writeBlobJson(BLOB_ORDERS_PATH, nextOrders);
      return { catalog, orders: nextOrders };
    }

    const seed = normalizeDb(await readSeedLegacy());
    const migrated = await migrateFromLegacy(seed);
    await Promise.all([
      writeBlobJson(BLOB_CATALOG_PATH, migrated.catalog),
      writeBlobJson(BLOB_ORDERS_PATH, migrated.orders),
    ]);
    return migrated;
  }

  const [catalog, orders, legacy] = await Promise.all([
    readJsonFile<CatalogStore>(CATALOG_PATH),
    readJsonFile<OrdersStore>(ORDERS_PATH),
    readJsonFile<Database>(LEGACY_DB_PATH),
  ]);

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

function normalizeDb(db: Database): Database {
  if (!Array.isArray(db.categories)) db.categories = [];
  if (!Array.isArray(db.products)) db.products = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  if (!Array.isArray(db.enquiries)) db.enquiries = [];
  if (typeof db.version !== "number") db.version = 1;
  if (typeof db.ordersVersion !== "number") db.ordersVersion = 1;

  db.categories = db.categories.map((category) => ({
    ...category,
    slug: resolveCategorySlug(category.slug),
    parent: category.parent ?? null,
  }));

  db.products = db.products.map((product) => ({
    ...product,
    category: resolveCategorySlug(product.category),
  }));

  return db;
}

function cloneDb(db: Database): Database {
  return structuredClone(db);
}

async function loadDb(): Promise<Database> {
  const { catalog, orders } = await loadCatalogAndOrders();
  return normalizeDb(composeDb(catalog, orders));
}

export async function readDb(): Promise<Database> {
  if (cachedDb) return cloneDb(cachedDb);

  if (!pendingDbRead) {
    pendingDbRead = loadDb()
      .then((db) => {
        cachedDb = cloneDb(db);
        return db;
      })
      .finally(() => {
        pendingDbRead = null;
      });
  }

  return cloneDb(await pendingDbRead);
}

function invalidateCatalogCache(): void {
  try {
    revalidateTag("catalog", "max");
  } catch {
    // revalidateTag is a no-op outside a Next.js request context
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
    const writes: Promise<void>[] = [];
    if (catalogChanged) writes.push(writeBlobJson(BLOB_CATALOG_PATH, catalog));
    if (ordersChanged) writes.push(writeBlobJson(BLOB_ORDERS_PATH, orders));
    await Promise.all(writes);
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

  cachedDb = cloneDb(next);

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

  for (const item of CATEGORY_TREE) {
    map.set(item.slug, item);
  }
  for (const custom of db.categories ?? []) {
    map.set(custom.slug, {
      ...custom,
      parent: custom.parent ?? null,
    });
  }
  for (const product of db.products) {
    if (!map.has(product.category)) {
      map.set(product.category, {
        slug: product.category,
        label: categoryLabel(product.category, db.categories),
        icon: "fa-tag",
        blurb: "Browse products",
        parent: null,
      });
    }
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
  const db = await readDb();
  const rawLabel = (label || labelOrSlug).trim();
  if (!rawLabel) throw new Error("Category name is required");

  let slug = slugifyCategory(label ? labelOrSlug : rawLabel);
  if (!slug) slug = `category-${Date.now().toString(36)}`;
  slug = resolveCategorySlug(slug);

  const parentSlug = parent ? resolveCategorySlug(parent) : null;
  if (parentSlug) {
    const parents = allCategoryDefs(db.categories);
    const parentExists = parents.some((c) => c.slug === parentSlug && !c.parent);
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
}

export async function getSettings(): Promise<Settings> {
  const db = await readDb();
  return db.settings;
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  const db = await readDb();
  db.settings = { ...db.settings, ...patch };
  await writeCatalogDb(db);
  return db.settings;
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

  let category = resolveCategorySlug(input.category.trim());
  if (input.categoryLabel?.trim()) {
    const ensured = await ensureCategory(
      category || input.categoryLabel,
      input.categoryLabel.trim()
    );
    category = ensured.slug;
  } else if (category && !CATEGORY_META[category]) {
    await ensureCategory(category, categoryLabel(category));
  }
  if (!category) throw new Error("Category is required");

  const db = await readDb();
  const leaves = getLeafCategories(db.categories);
  const parents = getParentCategories(db.categories);
  const isLeaf = leaves.some((c) => c.slug === category);
  const isParentOnly = parents.some(
    (c) =>
      c.slug === category && getChildCategories(c.slug, db.categories).length > 0
  );
  if (!isLeaf || isParentOnly) {
    throw new Error("Pick a subcategory (not a parent category)");
  }

  let slug = slugify(name) || `product-${Date.now()}`;
  const slugTaken = db.products.some((p) => p.slug === slug);
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const now = new Date().toISOString();
  const product: Product = {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    name,
    slug,
    category,
    type: input.type === "pack" ? "pack" : "product",
    status: input.status === "inactive" ? "inactive" : "active",
    description: (input.description || "").trim(),
    images: input.images?.length ? input.images : ["/products/appliance.svg"],
    imageVariants: input.imageVariants,
    cost: Number(input.cost) || 0,
    sellPrice: Number(input.sellPrice) || 0,
    mrp: input.mrp != null && input.mrp > 0 ? Number(input.mrp) : undefined,
    platformPrice: Number(input.platformPrice) || 0,
    platformName: (input.platformName || "Meesho").trim() || "Meesho",
    platformUrl: (input.platformUrl || "").trim(),
    stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
    commissionPercent:
      input.commissionPercent === undefined || input.commissionPercent === null
        ? null
        : Math.min(100, Math.max(0, Number(input.commissionPercent) || 0)),
    createdAt: now,
    updatedAt: now,
  };

  db.products.unshift(product);
  await writeCatalogDb(db);
  return product;
}

export async function updateProduct(
  id: string,
  patch: ProductUpdate
): Promise<Product | null> {
  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
    cachedDb = null;
    const db = await readDb();
    const expectedVersion = db.version ?? 1;
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const next: Product = {
      ...db.products[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    db.products[index] = next;

    const latest = await loadDb();
    if ((latest.version ?? 1) !== expectedVersion) continue;

    await writeCatalogDb(db);
    return next;
  }

  throw new Error("Could not save product due to concurrent updates");
}

export async function listOrders(): Promise<Order[]> {
  const db = await readDb();
  return [...db.orders].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = await readDb();
  return db.orders.find((o) => o.id === id) ?? null;
}

export async function createOrder(payload: CheckoutPayload): Promise<Order> {
  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
    cachedDb = null;
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
      platformName: product.platformName,
      platformUrl: product.platformUrl,
    }));

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.sellPrice * item.qty,
      0
    );

    const order: Order = {
      id: `ord-${Date.now().toString(36)}`,
      items: orderItems,
      subtotal,
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
      createdAt: new Date().toISOString(),
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
    await writeDb(db);
    return order;
  }

  throw new Error("Could not place order due to concurrent updates");
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  const db = await readDb();
  const index = db.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;
  db.orders[index] = { ...db.orders[index], status };
  await writeOrdersDb(db);
  return db.orders[index];
}

export async function getCounts() {
  const db = await readDb();
  return {
    products: db.products.length,
    packs: db.products.filter((p) => p.type === "pack").length,
    onlyProducts: db.products.filter((p) => p.type === "product").length,
    ordersNew: db.orders.filter((o) => o.status === "new").length,
    enquiriesNew: db.enquiries.filter((e) => e.status === "new").length,
  };
}

export function getCategories(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.category))].sort();
}
