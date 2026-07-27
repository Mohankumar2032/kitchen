import type { CategoryDef, PublicProduct } from "@/lib/types";
import {
  categoryLabel,
  matchingCategorySlugs,
  productCategorySlug,
} from "@/lib/types";

export const SHOP_PAGE_SIZE = 24;

export interface ShopQuery {
  category: string;
  q: string;
  page: number;
}

export interface CategoryCountMap {
  [slug: string]: number;
}

export function parseShopQuery(input: {
  category?: string;
  q?: string;
  page?: string;
}): ShopQuery {
  const page = Math.max(1, Number.parseInt(input.page || "1", 10) || 1);
  return {
    category: (input.category || "all").trim() || "all",
    q: (input.q || "").trim(),
    page,
  };
}

export function buildShopHref(detail: {
  category?: string;
  query?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();

  if (detail.category && detail.category !== "all") {
    params.set("category", detail.category);
  }
  if (detail.query) params.set("q", detail.query);
  if (detail.page && detail.page > 1) params.set("page", String(detail.page));

  const queryString = params.toString();
  return queryString ? `/shop?${queryString}` : "/shop";
}

export function computeCategoryCounts(
  products: PublicProduct[],
  categories: CategoryDef[]
): CategoryCountMap {
  const counts: CategoryCountMap = {};
  for (const item of categories) {
    const match = new Set(matchingCategorySlugs(item.slug, categories));
    counts[item.slug] = products.filter((p) =>
      match.has(productCategorySlug(p.category))
    ).length;
  }
  return counts;
}

export function filterShopProducts(
  products: PublicProduct[],
  categories: CategoryDef[],
  query: Pick<ShopQuery, "category" | "q">
): PublicProduct[] {
  const q = query.q.toLowerCase();
  const matchSlugs =
    query.category === "all"
      ? null
      : new Set(matchingCategorySlugs(query.category, categories));

  return products.filter((p) => {
    const category = productCategorySlug(p.category);
    if (matchSlugs && !matchSlugs.has(category)) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q) ||
      categoryLabel(category, categories).toLowerCase().includes(q)
    );
  });
}

export function paginateProducts<T>(
  items: T[],
  page: number,
  pageSize: number = SHOP_PAGE_SIZE
): { items: T[]; total: number; page: number; pageSize: number; hasMore: boolean } {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    total,
    page,
    pageSize,
    hasMore: start + slice.length < total,
  };
}
