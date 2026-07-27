"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import type { CategoryDef, PublicProduct } from "@/lib/types";
import {
  categoryLabel,
  categoryMeta,
  getChildCategories,
  getParentCategories,
} from "@/lib/types";
import type { CategoryCountMap } from "@/lib/shop-query";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";
const SEARCH_DEBOUNCE_MS = 220;

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
  counts: CategoryCountMap;
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
        const isParentActive = category === parent.slug;
        const hasActiveChild = children.some(
          (child) => child.slug === category
        );

        return (
          <div key={parent.slug} className="mt-1">
            <button
              type="button"
              className={cn(
                "side-link w-full touch-manipulation",
                isParentActive && "active",
                hasActiveChild && "ancestor-active"
              )}
              onClick={() => onSelect(parent.slug)}
              aria-current={isParentActive ? "page" : undefined}
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
                    aria-current={
                      category === child.slug ? "page" : undefined
                    }
                  >
                    <span className="truncate">{child.label}</span>
                    <span className="ml-2 shrink-0 opacity-80">
                      {counts[child.slug] || 0}
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

function filterKey(category: string, q: string): string {
  return `${category || "all"}:${q || ""}`;
}

export function ShopBrowser({
  initialProducts,
  totalFiltered,
  totalActive,
  categories,
  categoryCounts,
  initialCategory = "all",
  initialQuery = "",
  pageSize,
}: {
  initialProducts: PublicProduct[];
  totalFiltered: number;
  totalActive: number;
  categories: CategoryDef[];
  categoryCounts: CategoryCountMap;
  initialCategory?: string;
  initialQuery?: string;
  pageSize: number;
}) {
  const [category, setCategory] = useQueryState(
    "category",
    parseAsString.withDefault(initialCategory === "all" ? "" : initialCategory)
  );
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault(initialQuery)
  );

  const activeCategory = category || "all";
  const [searchInput, setSearchInput] = useState(query || "");
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(totalFiltered);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(initialProducts.length < totalFiltered);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const appliedFilterRef = useRef(
    filterKey(initialCategory || "all", initialQuery || "")
  );
  const skipNextFilterFetchRef = useRef(true);

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(totalFiltered);
    setPage(1);
    setHasMore(initialProducts.length < totalFiltered);
    appliedFilterRef.current = filterKey(
      initialCategory || "all",
      initialQuery || ""
    );
    skipNextFilterFetchRef.current = true;
  }, [initialProducts, totalFiltered, initialCategory, initialQuery]);

  useEffect(() => {
    setSearchInput(query || "");
  }, [query]);

  const fetchPage = useCallback(
    async (
      nextPage: number,
      replace: boolean,
      overrides?: { category?: string; q?: string }
    ) => {
      const nextCategory = overrides?.category ?? activeCategory;
      const nextQuery = overrides?.q ?? query ?? "";

      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      setIsFetching(true);

      try {
        const params = new URLSearchParams();
        if (nextCategory !== "all") params.set("category", nextCategory);
        if (nextQuery) params.set("q", nextQuery);
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/shop?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          products: PublicProduct[];
          total: number;
          hasMore: boolean;
          page: number;
        };

        appliedFilterRef.current = filterKey(nextCategory, nextQuery);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(data.page);
        setProducts((prev) =>
          replace ? data.products : [...prev, ...data.products]
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      } finally {
        setIsFetching(false);
      }
    },
    [activeCategory, query, pageSize]
  );

  // When URL filter changes (sidebar, header, back/forward), load matching products.
  useEffect(() => {
    const key = filterKey(activeCategory, query || "");
    if (skipNextFilterFetchRef.current) {
      skipNextFilterFetchRef.current = false;
      appliedFilterRef.current = key;
      return;
    }
    if (key === appliedFilterRef.current) return;
    void fetchPage(1, true, {
      category: activeCategory,
      q: query || "",
    });
  }, [activeCategory, query, fetchPage]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === (query || "")) return;
      void setQuery(next || null);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, setQuery, query]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const media = window.matchMedia(DESKTOP_BREAKPOINT);
    if (media.matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isFetching) return;
        void fetchPage(page + 1, false);
      },
      { rootMargin: "280px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, isFetching, page]);

  function selectCategory(next: string) {
    const nextCategory = next === "all" ? "all" : next;
    void setCategory(nextCategory === "all" ? null : nextCategory);
    // Fetch immediately with the clicked category (don't wait for nuqs/RSC).
    void fetchPage(1, true, { category: nextCategory, q: query || "" });
  }

  const visibleParents = useMemo(() => {
    return getParentCategories(categories)
      .filter((c) => c.slug !== "packs")
      .map((parent) => {
        const children = getChildCategories(parent.slug, categories).filter(
          (child) => (categoryCounts[child.slug] || 0) > 0
        );
        return {
          parent,
          children,
          count: categoryCounts[parent.slug] || 0,
        };
      })
      .filter((item) => item.count > 0);
  }, [categories, categoryCounts]);

  const activeMobileParent = visibleParents.find(
    ({ parent, children }) =>
      parent.slug === activeCategory ||
      children.some((child) => child.slug === activeCategory)
  );

  return (
    <div className="fade-up space-y-4">
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
                activeCategory === activeMobileParent.parent.slug && "active"
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
                  activeCategory === child.slug && "active"
                )}
                onClick={() => selectCategory(child.slug)}
              >
                {child.label} ({categoryCounts[child.slug] || 0})
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
              productsCount={totalActive}
              visibleParents={visibleParents}
              counts={categoryCounts}
              categories={categories}
              category={activeCategory}
              onSelect={selectCategory}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="panel p-2.5 sm:p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="section-title mb-0">
                {activeCategory === "all"
                  ? "Shop"
                  : categoryLabel(activeCategory, categories)}
              </h1>
              <div className="input-search-wrap hidden w-full max-w-sm lg:block">
                <i className="fa-solid fa-magnifying-glass" aria-hidden />
                <input
                  className="input-search"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search products"
                />
              </div>
            </div>
          </div>

          {products.length === 0 ? (
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
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 4}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-2 pt-1">
                <p className="text-[11px] text-muted">
                  Showing {products.length} of {total} products
                  {isFetching ? " · Updating…" : ""}
                </p>
                {hasMore ? (
                  <>
                    <div
                      ref={loadMoreRef}
                      className="h-8 w-full lg:hidden"
                      aria-hidden
                    />
                    {isFetching ? (
                      <p className="text-[11px] text-muted lg:hidden">
                        Loading more…
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-ghost hidden min-h-10 px-6 lg:inline-flex"
                      disabled={isFetching}
                      onClick={() => void fetchPage(page + 1, false)}
                    >
                      {isFetching ? "Loading…" : "Load more products"}
                      <i className="fa-solid fa-chevron-down" aria-hidden />
                    </button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
