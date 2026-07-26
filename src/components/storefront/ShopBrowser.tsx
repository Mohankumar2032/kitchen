"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryDef, PublicProduct } from "@/lib/types";
import {
  categoryLabel,
  categoryMeta,
  getChildCategories,
  getParentCategories,
  matchingCategorySlugs,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

type VisibleParent = {
  parent: CategoryDef;
  children: CategoryDef[];
  count: number;
};

function CategoryNav({
  productsCount,
  visibleParents,
  counts,
  categories,
  category,
  onSelect,
  className,
}: {
  productsCount: number;
  visibleParents: VisibleParent[];
  counts: Map<string, number>;
  categories: CategoryDef[];
  category: string;
  onSelect: (slug: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        className={cn(
          "side-link w-full touch-manipulation",
          category === "all" && "active"
        )}
        onClick={() => onSelect("all")}
      >
        <span>All products</span>
        <span className="opacity-80">{productsCount}</span>
      </button>

      {visibleParents.map(({ parent, children, count }) => {
        const meta = categoryMeta(parent.slug, categories);
        const parentActive = category === parent.slug;

        return (
          <div key={parent.slug} className="mt-1">
            <button
              type="button"
              className={cn(
                "side-link w-full touch-manipulation",
                parentActive && "active"
              )}
              onClick={() => onSelect(parent.slug)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <i
                  className={`fa-solid ${meta.icon} shrink-0 text-[12px] opacity-80`}
                  aria-hidden
                />
                <span className="truncate">{parent.label}</span>
              </span>
              <span className="ml-2 shrink-0 opacity-80">{count}</span>
            </button>

            {children.length > 0 ? (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                {children.map((child) => (
                  <button
                    key={child.slug}
                    type="button"
                    className={cn(
                      "side-link w-full touch-manipulation py-1.5 text-[12px]",
                      category === child.slug && "active"
                    )}
                    onClick={() => onSelect(child.slug)}
                  >
                    <span className="truncate">{child.label}</span>
                    <span className="ml-2 shrink-0 opacity-80">
                      {counts.get(child.slug) || 0}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ShopBrowser({
  products,
  categories,
  initialCategory = "all",
  initialQuery = "",
}: {
  products: PublicProduct[];
  categories: CategoryDef[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl =
    searchParams.get("category") || initialCategory || "all";
  const queryFromUrl = searchParams.get("q") || initialQuery || "";

  const category = categoryFromUrl;
  const [query, setQuery] = useState(queryFromUrl);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of categories) {
      const match = new Set(matchingCategorySlugs(item.slug, categories));
      map.set(
        item.slug,
        products.filter((p) => match.has(p.category)).length
      );
    }
    return map;
  }, [products, categories]);

  const visibleParents = useMemo(() => {
    return getParentCategories(categories)
      .filter((c) => c.slug !== "packs")
      .map((parent) => {
        const children = getChildCategories(parent.slug, categories).filter(
          (child) => (counts.get(child.slug) || 0) > 0
        );
        return { parent, children, count: counts.get(parent.slug) || 0 };
      })
      .filter((item) => item.count > 0);
  }, [categories, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchSlugs =
      category === "all"
        ? null
        : new Set(matchingCategorySlugs(category, categories));

    let list = products.filter((p) => {
      if (matchSlugs && !matchSlugs.has(p.category)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        categoryLabel(p.category, categories).toLowerCase().includes(q)
      );
    });

    list = [...list];
    return list;
  }, [products, category, query, categories]);

  function selectCategory(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("category");
    else params.set("category", next);
    const qs = params.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  }

  const activeMobileParent = visibleParents.find(
    ({ parent, children }) =>
      parent.slug === category ||
      children.some((child) => child.slug === category)
  );

  return (
    <div className="fade-up space-y-4">
      {/* Mobile: header = main categories; here only subcategory pills */}
      {activeMobileParent?.children.length ? (
        <div className="panel relative z-10 p-3 lg:hidden">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Filter by type
          </p>
          <div className="chips-scroll">
            <button
              type="button"
              className={cn(
                "pill touch-manipulation",
                category === activeMobileParent.parent.slug && "active"
              )}
              onClick={() => selectCategory(activeMobileParent.parent.slug)}
            >
              All ({activeMobileParent.count})
            </button>
            {activeMobileParent.children.map((child) => (
              <button
                key={child.slug}
                type="button"
                className={cn(
                  "pill touch-manipulation",
                  category === child.slug && "active"
                )}
                onClick={() => selectCategory(child.slug)}
              >
                {child.label} ({counts.get(child.slug) || 0})
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-5">
        <aside className="panel hidden max-h-[calc(100vh-148px)] flex-col overflow-hidden p-0 lg:sticky lg:top-[132px] lg:flex">
          <p className="shrink-0 border-b border-border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Categories
          </p>
          <div className="flex-1 overflow-y-auto overscroll-contain p-2">
            <CategoryNav
              productsCount={products.length}
              visibleParents={visibleParents}
              counts={counts}
              categories={categories}
              category={category}
              onSelect={selectCategory}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="panel p-2.5 sm:p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="section-title mb-0">
                {category === "all"
                  ? "Shop"
                  : categoryLabel(category, categories)}
              </h1>
              <div className="input-search-wrap hidden w-full max-w-sm lg:block">
                <i className="fa-solid fa-magnifying-glass" aria-hidden />
                <input
                  className="input-search"
                  placeholder="Search products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search products"
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel p-10 text-center sm:p-12">
              <i
                className="fa-solid fa-box-open mb-3 text-2xl text-theme"
                aria-hidden
              />
              <p className="font-semibold">No products found</p>
              <p className="mt-1 text-muted">
                Try another category or search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {filtered.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
