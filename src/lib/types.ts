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
  /** Parent category slug. Leaf categories are assigned to products. */
  parent?: string | null;
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
  { label: string; icon: string; blurb: string; parent?: string | null }
> = {
  appliances: {
    label: "Appliances",
    icon: "fa-kitchen-set",
    blurb: "Mixers, induction & electric essentials",
  },
  mixers: {
    label: "Mixers",
    icon: "fa-blender",
    blurb: "Mixer grinders for daily cooking",
    parent: "appliances",
  },
  induction: {
    label: "Induction",
    icon: "fa-bolt",
    blurb: "Fast, safe electric cooking",
    parent: "appliances",
  },
  blenders: {
    label: "Blenders",
    icon: "fa-blender",
    blurb: "Smoothies & wet grinding",
    parent: "appliances",
  },
  "air-fryers": {
    label: "Air Fryers",
    icon: "fa-wind",
    blurb: "Crispy cooking with less oil",
    parent: "appliances",
  },
  "rice-cookers": {
    label: "Rice Cookers",
    icon: "fa-bowl-rice",
    blurb: "Perfect rice, every time",
    parent: "appliances",
  },
  "electric-kettles": {
    label: "Electric Kettles",
    icon: "fa-mug-hot",
    blurb: "Boil water in minutes",
    parent: "appliances",
  },
  cookware: {
    label: "Cookware",
    icon: "fa-fire-burner",
    blurb: "Pans, tawas & everyday pots",
  },
  "pressure-cookers": {
    label: "Pressure Cookers",
    icon: "fa-gauge-high",
    blurb: "Fast cooking under pressure",
    parent: "cookware",
  },
  "fry-pans": {
    label: "Fry Pans",
    icon: "fa-fire",
    blurb: "Non-stick & everyday frying",
    parent: "cookware",
  },
  tawas: {
    label: "Tawas",
    icon: "fa-circle",
    blurb: "Rotis, dosas & flat cooking",
    parent: "cookware",
  },
  kadai: {
    label: "Kadai",
    icon: "fa-utensils",
    blurb: "Deep pans for Indian cooking",
    parent: "cookware",
  },
  pots: {
    label: "Pots",
    icon: "fa-kitchen-set",
    blurb: "Boiling, stewing & stock pots",
    parent: "cookware",
  },
  storage: {
    label: "Storage",
    icon: "fa-box",
    blurb: "Containers, jars & organisers",
  },
  containers: {
    label: "Containers",
    icon: "fa-box",
    blurb: "Airtight jars & fridge boxes",
    parent: "storage",
  },
  "spice-jars": {
    label: "Spice Jars",
    icon: "fa-jar",
    blurb: "Keep masalas fresh & tidy",
    parent: "storage",
  },
  "lunch-boxes": {
    label: "Lunch Boxes",
    icon: "fa-briefcase",
    blurb: "Office & school meal boxes",
    parent: "storage",
  },
  bottles: {
    label: "Bottles",
    icon: "fa-bottle-water",
    blurb: "Water bottles & flasks",
    parent: "storage",
  },
  organizers: {
    label: "Organizers",
    icon: "fa-table-cells-large",
    blurb: "Racks, stands & organisers",
    parent: "storage",
  },
  "kitchen-tools": {
    label: "Kitchen Tools",
    icon: "fa-screwdriver-wrench",
    blurb: "Prep tools for every day",
  },
  cutters: {
    label: "Cutters",
    icon: "fa-scissors",
    blurb: "Cookie cutters & cutting tools",
    parent: "kitchen-tools",
  },
  peelers: {
    label: "Peelers",
    icon: "fa-carrot",
    blurb: "Quick vegetable peeling",
    parent: "kitchen-tools",
  },
  choppers: {
    label: "Choppers",
    icon: "fa-scissors",
    blurb: "Quick prep, less effort",
    parent: "kitchen-tools",
  },
  graters: {
    label: "Graters",
    icon: "fa-cheese",
    blurb: "Grate cheese, veggies & more",
    parent: "kitchen-tools",
  },
  mashers: {
    label: "Mashers",
    icon: "fa-mortar-pestle",
    blurb: "Mash potatoes & more",
    parent: "kitchen-tools",
  },
  "measuring-tools": {
    label: "Measuring Tools",
    icon: "fa-ruler",
    blurb: "Measuring cups, spoons & scales",
    parent: "kitchen-tools",
  },
  baking: {
    label: "Baking",
    icon: "fa-bread-slice",
    blurb: "Baking paper, moulds & accessories",
  },
  "baking-paper": {
    label: "Baking Paper",
    icon: "fa-scroll",
    blurb: "Butter paper & parchment rolls",
    parent: "baking",
  },
  dining: {
    label: "Dining",
    icon: "fa-utensils",
    blurb: "Plates, bowls & serving sets",
  },
  plates: {
    label: "Plates",
    icon: "fa-plate-wheat",
    blurb: "Everyday dining plates",
    parent: "dining",
  },
  bowls: {
    label: "Bowls",
    icon: "fa-bowl-food",
    blurb: "Serving & soup bowls",
    parent: "dining",
  },
  glasses: {
    label: "Glasses",
    icon: "fa-whiskey-glass",
    blurb: "Tumblers & drinking glasses",
    parent: "dining",
  },
  mugs: {
    label: "Mugs",
    icon: "fa-mug-saucer",
    blurb: "Tea & coffee mugs",
    parent: "dining",
  },
  "serving-sets": {
    label: "Serving Sets",
    icon: "fa-gift",
    blurb: "Serving trays & sets",
    parent: "dining",
  },
  cleaning: {
    label: "Cleaning",
    icon: "fa-broom",
    blurb: "Brushes, scrubbers & gloves",
  },
  brushes: {
    label: "Brushes",
    icon: "fa-brush",
    blurb: "Kitchen cleaning brushes",
    parent: "cleaning",
  },
  scrubbers: {
    label: "Scrubbers",
    icon: "fa-soap",
    blurb: "Scrub pads & sponges",
    parent: "cleaning",
  },
  gloves: {
    label: "Gloves",
    icon: "fa-hands",
    blurb: "Kitchen & cleaning gloves",
    parent: "cleaning",
  },
  "cleaning-accessories": {
    label: "Cleaning Accessories",
    icon: "fa-pump-soap",
    blurb: "Mats, aprons & cleaning extras",
    parent: "cleaning",
  },
  packs: {
    label: "Combo Packs",
    icon: "fa-gift",
    blurb: "Value bundles for new homes",
  },
};

/** Old product slugs → new leaf categories. */
export const CATEGORY_ALIASES: Record<string, string> = {
  "plastic-containers": "containers",
  "mixer-grinders": "mixers",
  kettles: "electric-kettles",
  "kitchen-appliances": "mixers",
  "kitchen-linens": "cleaning-accessories",
  "baking-tools": "baking-paper",
  "kitchen-organizer": "organizers",
};

export const CATEGORY_TREE: CategoryDef[] = Object.entries(CATEGORY_META).map(
  ([slug, meta]) => ({
    slug,
    label: meta.label,
    icon: meta.icon,
    blurb: meta.blurb,
    parent: meta.parent ?? null,
  })
);

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
  const resolved = resolveCategorySlug(slug);
  if (CATEGORY_META[resolved]?.label) return CATEGORY_META[resolved].label;
  const fromCustom = custom?.find((c) => c.slug === resolved)?.label;
  if (fromCustom) return fromCustom;
  return resolved
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function categoryMeta(
  slug: string,
  custom?: CategoryDef[] | null
): { label: string; icon: string; blurb: string; parent?: string | null } {
  const resolved = resolveCategorySlug(slug);
  const builtIn = CATEGORY_META[resolved];
  if (builtIn) return builtIn;
  const fromCustom = custom?.find((c) => c.slug === resolved);
  return {
    label: categoryLabel(resolved, custom),
    icon: fromCustom?.icon || "fa-tag",
    blurb: fromCustom?.blurb || "Browse products",
    parent: fromCustom?.parent ?? null,
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

export function resolveCategorySlug(slug: string): string {
  return CATEGORY_ALIASES[slug] || slug;
}

export function allCategoryDefs(
  custom?: CategoryDef[] | null
): CategoryDef[] {
  const map = new Map<string, CategoryDef>();
  for (const item of CATEGORY_TREE) map.set(item.slug, item);
  for (const item of custom ?? []) {
    map.set(item.slug, {
      ...item,
      parent: item.parent ?? null,
    });
  }
  return [...map.values()];
}

export function getParentCategories(
  custom?: CategoryDef[] | null
): CategoryDef[] {
  return allCategoryDefs(custom).filter((c) => !c.parent);
}

export function getChildCategories(
  parentSlug: string,
  custom?: CategoryDef[] | null
): CategoryDef[] {
  return allCategoryDefs(custom).filter((c) => c.parent === parentSlug);
}

export function getLeafCategories(
  custom?: CategoryDef[] | null
): CategoryDef[] {
  const all = allCategoryDefs(custom);
  const parentSlugs = new Set(
    all.filter((c) => c.parent).map((c) => c.parent as string)
  );
  // Leaves (have parent) + top-level with no children (e.g. packs)
  return all.filter((c) => Boolean(c.parent) || !parentSlugs.has(c.slug));
}

/** Slugs that match a selected category (parent expands to children). */
export function matchingCategorySlugs(
  slug: string,
  custom?: CategoryDef[] | null
): string[] {
  const resolved = resolveCategorySlug(slug);
  const children = getChildCategories(resolved, custom);
  if (children.length === 0) return [resolved];
  return [resolved, ...children.map((c) => c.slug)];
}

export function categoryPathLabel(
  slug: string,
  custom?: CategoryDef[] | null
): string {
  const resolved = resolveCategorySlug(slug);
  const meta = categoryMeta(resolved, custom);
  if (!meta.parent) return meta.label;
  return `${categoryLabel(meta.parent, custom)} › ${meta.label}`;
}
