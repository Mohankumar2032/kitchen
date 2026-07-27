import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import {
  computeCategoryCounts,
  type CategoryCountMap,
} from "@/lib/shop-query";
import {
  getProductBySlug,
  listActiveProducts,
  listCategoryOptions,
} from "@/lib/store";
import type { CategoryDef, Product, PublicProduct } from "@/lib/types";
import { toPublicProduct } from "@/lib/types";

export interface PublicCatalog {
  products: PublicProduct[];
  categories: CategoryDef[];
  categoryCounts: CategoryCountMap;
  totalActive: number;
}

async function loadPublicCatalog(): Promise<PublicCatalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const [active, categories] = await Promise.all([
    listActiveProducts(),
    listCategoryOptions(),
  ]);
  const products = active.map(toPublicProduct);
  return {
    products,
    categories,
    categoryCounts: computeCategoryCounts(products, categories),
    totalActive: products.length,
  };
}

/** Request-local dedupe + Next.js Cache Components catalog cache. */
export const getPublicCatalog = cache(loadPublicCatalog);

export async function getNavCategories(): Promise<
  Array<{ slug: string; label: string; childSlugs: string[]; count: number }>
> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const { products, categories, categoryCounts } = await loadPublicCatalog();
  const { getChildCategories, getParentCategories } = await import("@/lib/types");

  return getParentCategories(categories)
    .filter((parent) => parent.slug !== "packs")
    .map((parent) => ({
      slug: parent.slug,
      label: parent.label,
      childSlugs: getChildCategories(parent.slug, categories).map((c) => c.slug),
      count: categoryCounts[parent.slug] || 0,
    }))
    .filter((parent) => parent.count > 0);
}

export async function getCachedProductBySlug(
  slug: string
): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return getProductBySlug(slug);
}

export async function getRelatedProducts(
  productId: string,
  category: string,
  limit = 4
): Promise<PublicProduct[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const active = await listActiveProducts();
  return active
    .filter((p) => p.id !== productId && p.category === category)
    .slice(0, limit)
    .map(toPublicProduct);
}
