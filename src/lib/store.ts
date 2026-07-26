import { promises as fs } from "fs";
import path from "path";
import { head, put } from "@vercel/blob";
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
  categoryLabel,
  slugifyCategory,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
/** Durable JSON store on Vercel (local filesystem is read-only there). */
const BLOB_DB_PATH = "kitchen/db.json";

function useBlobDb(): boolean {
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

async function readSeedDb(): Promise<Database> {
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as Database;
}

async function readDbFromBlob(): Promise<Database | null> {
  try {
    const meta = await head(BLOB_DB_PATH, blobOpts());
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Database;
  } catch {
    return null;
  }
}

async function writeDbToBlob(db: Database): Promise<void> {
  await put(BLOB_DB_PATH, JSON.stringify(db, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    ...blobOpts(),
  });
}

function normalizeDb(db: Database): Database {
  if (!Array.isArray(db.categories)) db.categories = [];
  if (!Array.isArray(db.products)) db.products = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  if (!Array.isArray(db.enquiries)) db.enquiries = [];
  return db;
}

export async function readDb(): Promise<Database> {
  if (useBlobDb()) {
    const fromBlob = await readDbFromBlob();
    if (fromBlob) return normalizeDb(fromBlob);
    // First deploy: seed Blob from packaged data/db.json
    const seed = normalizeDb(await readSeedDb());
    await writeDbToBlob(seed);
    return seed;
  }

  const raw = await fs.readFile(DB_PATH, "utf8");
  return normalizeDb(JSON.parse(raw) as Database);
}

export async function writeDb(db: Database): Promise<void> {
  const next = normalizeDb(db);
  if (useBlobDb()) {
    await writeDbToBlob(next);
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(next, null, 2), "utf8");
}

export async function listCategoryOptions(): Promise<CategoryDef[]> {
  const db = await readDb();
  const map = new Map<string, CategoryDef>();

  for (const [slug, meta] of Object.entries(CATEGORY_META)) {
    map.set(slug, {
      slug,
      label: meta.label,
      icon: meta.icon,
      blurb: meta.blurb,
    });
  }
  for (const custom of db.categories ?? []) {
    map.set(custom.slug, custom);
  }
  for (const product of db.products) {
    if (!map.has(product.category)) {
      map.set(product.category, {
        slug: product.category,
        label: categoryLabel(product.category, db.categories),
        icon: "fa-tag",
        blurb: "Browse products",
      });
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function ensureCategory(
  labelOrSlug: string,
  label?: string
): Promise<CategoryDef> {
  const db = await readDb();
  const rawLabel = (label || labelOrSlug).trim();
  if (!rawLabel) throw new Error("Category name is required");

  let slug = slugifyCategory(label ? labelOrSlug : rawLabel);
  if (!slug) slug = `category-${Date.now().toString(36)}`;

  const existing =
    (db.categories ?? []).find((c) => c.slug === slug) ||
    (CATEGORY_META[slug]
      ? {
          slug,
          label: CATEGORY_META[slug].label,
          icon: CATEGORY_META[slug].icon,
          blurb: CATEGORY_META[slug].blurb,
        }
      : null);

  if (existing) return existing;

  const created: CategoryDef = {
    slug,
    label: rawLabel,
    icon: "fa-tag",
    blurb: "Browse products",
  };
  db.categories = [...(db.categories ?? []), created];
  await writeDb(db);
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
  await writeDb(db);
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
  /** When set, creates/registers a custom category with this label. */
  categoryLabel?: string;
  type?: Product["type"];
  status?: Product["status"];
  description?: string;
  images?: string[];
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

  let category = input.category.trim();
  if (input.categoryLabel?.trim()) {
    const ensured = await ensureCategory(
      category || input.categoryLabel,
      input.categoryLabel.trim()
    );
    category = ensured.slug;
  } else if (category && !CATEGORY_META[category]) {
    // Persist unknown slug as a custom category for reuse in admin
    await ensureCategory(category, categoryLabel(category));
  }
  if (!category) throw new Error("Category is required");

  const db = await readDb();

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
  await writeDb(db);
  return product;
}

export async function updateProduct(
  id: string,
  patch: ProductUpdate
): Promise<Product | null> {
  const db = await readDb();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const next: Product = {
    ...db.products[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  db.products[index] = next;
  await writeDb(db);
  return next;
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
  const db = await readDb();

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
    return {
      product,
      qty,
    };
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
  await writeDb(db);
  return order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  const db = await readDb();
  const index = db.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;
  db.orders[index] = { ...db.orders[index], status };
  await writeDb(db);
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
