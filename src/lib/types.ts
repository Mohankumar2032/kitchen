export type ProductType = "product" | "pack";
export type ProductStatus = "active" | "inactive";
export type OrderStatus =
  | "new"
  | "confirmed"
  | "fulfilling"
  | "shipped"
  | "cancelled";

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: ProductType;
  status: ProductStatus;
  description: string;
  images: string[];
  /** What you pay when fulfilling from source (admin only) */
  cost: number;
  /** Customer-facing store price */
  sellPrice: number;
  /** Optional MRP for strikethrough display on storefront */
  mrp?: number;
  /**
   * Source platform price (Meesho/Amazon/etc). Admin-only.
   * Never expose platformName / platformUrl / platformPrice on the storefront.
   */
  platformPrice: number;
  platformName: string;
  platformUrl: string;
  stock: number;
  /** Per-product commission override; null = use default */
  commissionPercent: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Safe fields for customer-facing APIs / UI */
export type PublicProduct = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "category"
  | "type"
  | "status"
  | "description"
  | "images"
  | "sellPrice"
  | "mrp"
  | "stock"
>;

export interface Settings {
  defaultCommissionPercent: number;
  storeName: string;
  currency: string;
}

export interface Enquiry {
  id: string;
  productId: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
  status: "new" | "read" | "closed";
}

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  sellPrice: number;
  /** Admin fulfillment helpers — never shown to customer */
  platformName?: string;
  platformUrl?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  status: OrderStatus;
  createdAt: string;
}

export interface CheckoutPayload {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
  items: Array<{ productId: string; qty: number }>;
}

export interface CategoryDef {
  slug: string;
  label: string;
  icon?: string;
  blurb?: string;
}

export interface Database {
  settings: Settings;
  /** Custom categories added from admin (merged with built-in CATEGORY_META). */
  categories?: CategoryDef[];
  products: Product[];
  enquiries: Enquiry[];
  orders: Order[];
}

export type ProductUpdate = Partial<
  Pick<
    Product,
    | "name"
    | "category"
    | "type"
    | "status"
    | "description"
    | "images"
    | "cost"
    | "sellPrice"
    | "platformPrice"
    | "platformName"
    | "platformUrl"
    | "stock"
    | "commissionPercent"
  >
>;

export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    type: product.type,
    status: product.status,
    description: product.description,
    images: product.images,
    sellPrice: product.sellPrice,
    mrp: product.mrp,
    stock: product.stock,
  };
}

export function discountPercent(sellPrice: number, mrp?: number): number | null {
  if (!mrp || mrp <= sellPrice) return null;
  return Math.round(((mrp - sellPrice) / mrp) * 100);
}

export const CATEGORY_META: Record<
  string,
  { label: string; icon: string; blurb: string }
> = {
  "plastic-containers": {
    label: "Plastic Containers",
    icon: "fa-box",
    blurb: "Airtight jars & fridge organisers",
  },
  cutters: {
    label: "Cutters",
    icon: "fa-scissors",
    blurb: "Cookie cutters & kitchen tools",
  },
  "kitchen-linens": {
    label: "Kitchen Linens",
    icon: "fa-shirt",
    blurb: "Aprons, mats & cloth essentials",
  },
  "baking-tools": {
    label: "Baking Tools",
    icon: "fa-bread-slice",
    blurb: "Butter paper & baking helpers",
  },
  "mixer-grinders": {
    label: "Mixer Grinders",
    icon: "fa-blender",
    blurb: "Powerful grinding for daily cooking",
  },
  cookware: {
    label: "Cookware",
    icon: "fa-fire-burner",
    blurb: "Pans & kadhais for every meal",
  },
  induction: {
    label: "Induction",
    icon: "fa-bolt",
    blurb: "Fast, safe electric cooking",
  },
  choppers: {
    label: "Choppers",
    icon: "fa-scissors",
    blurb: "Quick prep, less effort",
  },
  kettles: {
    label: "Kettles",
    icon: "fa-mug-hot",
    blurb: "Boil water in minutes",
  },
  storage: {
    label: "Storage",
    icon: "fa-box",
    blurb: "Keep the kitchen organised",
  },
  "kitchen-appliances": {
    label: "Appliances",
    icon: "fa-kitchen-set",
    blurb: "Essential home appliances",
  },
  packs: {
    label: "Combo Packs",
    icon: "fa-gift",
    blurb: "Value bundles for new homes",
  },
};

export function calcProfit(cost: number, sellPrice: number): number {
  return Math.round((sellPrice - cost) * 100) / 100;
}

export function effectiveCommission(
  product: Product,
  settings: Settings
): number {
  return product.commissionPercent ?? settings.defaultCommissionPercent;
}

export function commissionAmount(
  sellPrice: number,
  commissionPercent: number
): number {
  return Math.round(((sellPrice * commissionPercent) / 100) * 100) / 100;
}

export function categoryLabel(
  slug: string,
  custom?: CategoryDef[] | null
): string {
  if (CATEGORY_META[slug]?.label) return CATEGORY_META[slug].label;
  const fromCustom = custom?.find((c) => c.slug === slug)?.label;
  if (fromCustom) return fromCustom;
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function categoryMeta(
  slug: string,
  custom?: CategoryDef[] | null
): { label: string; icon: string; blurb: string } {
  const builtIn = CATEGORY_META[slug];
  if (builtIn) return builtIn;
  const fromCustom = custom?.find((c) => c.slug === slug);
  return {
    label: categoryLabel(slug, custom),
    icon: fromCustom?.icon || "fa-tag",
    blurb: fromCustom?.blurb || "Browse products",
  };
}

export function slugifyCategory(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
