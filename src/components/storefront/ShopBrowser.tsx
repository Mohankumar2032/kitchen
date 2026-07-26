"use client";

import { useMemo, useState } from "react";
import type { PublicProduct } from "@/lib/types";
import { CATEGORY_META, categoryLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

export function ShopBrowser({
  products,
  categories,
  initialCategory = "all",
  initialQuery = "",
}: {
  products: PublicProduct[];
  categories: string[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.sellPrice - b.sellPrice);
    if (sort === "price-desc") list.sort((a, b) => b.sellPrice - a.sellPrice);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, query, sort]);

  return (
    <div className="fade-up space-y-4">
      <div className="panel p-3 lg:hidden">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Categories
        </p>
        <div className="chips-scroll">
          <button
            type="button"
            className={cn("pill", category === "all" && "active")}
            onClick={() => setCategory("all")}
          >
            All ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn("pill", category === cat && "active")}
              onClick={() => setCategory(cat)}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5">
        <aside className="panel hidden h-fit p-3 lg:sticky lg:top-[132px] lg:block">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Categories
          </p>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className={cn("side-link", category === "all" && "active")}
              onClick={() => setCategory("all")}
            >
              <span>All products</span>
              <span className="opacity-80">{products.length}</span>
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  className={cn("side-link", category === cat && "active")}
                  onClick={() => setCategory(cat)}
                >
                  <span className="inline-flex items-center gap-2">
                    <i
                      className={`fa-solid ${meta?.icon || "fa-tag"} text-[12px] opacity-80`}
                      aria-hidden
                    />
                    {categoryLabel(cat)}
                  </span>
                  <span className="opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="panel p-2.5 sm:p-3">
            <div className="mb-2">
              <h1 className="section-title">
                {category === "all" ? "Shop" : categoryLabel(category)}
              </h1>
            </div>

            <div className="toolbar-row">
              <div className="input-search-wrap">
                <i className="fa-solid fa-magnifying-glass" aria-hidden />
                <input
                  className="input-search"
                  placeholder="Search products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search products"
                />
              </div>

              <label className="sort-field sort-field-inline">
                <span>Sort by</span>
                <select
                  className="input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel p-10 text-center sm:p-12">
              <i className="fa-solid fa-box-open mb-3 text-2xl text-theme" aria-hidden />
              <p className="font-semibold">No products found</p>
              <p className="mt-1 text-muted">Try another category or search term.</p>
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
