export type ProductType = "product" | "pack";
export type ProductStatus = "active" | "inactive";

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: ProductType;
  status: ProductStatus;
  description: string;
  images: string[];
  /** Your purchase / supplier cost */
  cost: number;
  /** Your selling price on this store */
  sellPrice: number;
  /** Original listing price on other platform (e.g. Meesho) */
  platformPrice: number;
  platformName: string;
  platformUrl: string;
  stock: number;
  /** Per-product commission override; null = use default */
  commissionPercent: number | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface Order {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  sellPrice: number;
  customerName: string;
  customerPhone: string;
  status: "new" | "confirmed" | "shipped" | "cancelled";
  createdAt: string;
}

export interface Database {
  settings: Settings;
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
