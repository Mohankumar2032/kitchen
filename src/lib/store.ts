import { promises as fs } from "fs";
import path from "path";
import type {
  CheckoutPayload,
  Database,
  Order,
  OrderStatus,
  Product,
  ProductUpdate,
  Settings,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readDb(): Promise<Database> {
  await ensureDir();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as Database;
}

export async function writeDb(db: Database): Promise<void> {
  await ensureDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
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
