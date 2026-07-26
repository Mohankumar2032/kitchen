"use client";

import Image from "next/image";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { ImageGalleryEditor } from "@/components/admin/ImageGalleryEditor";
import { isUnoptimizedImage } from "@/lib/images";
import type { CategoryDef, Product, Settings } from "@/lib/types";
import {
  calcProfit,
  categoryLabel,
  commissionAmount,
  effectiveCommission,
} from "@/lib/types";
import { cn, formatINR, formatINRPrecise } from "@/lib/utils";

type Counts = {
  products: number;
  packs: number;
  onlyProducts: number;
};

type Draft = {
  cost: string;
  sellPrice: string;
  platformPrice: string;
  stock: string;
  commissionPercent: string;
  images: string[];
};

type NewProductForm = {
  name: string;
  category: string;
  type: "product" | "pack";
  sellPrice: string;
  cost: string;
  platformPrice: string;
  stock: string;
  platformName: string;
  platformUrl: string;
  description: string;
  images: string[];
};

const EMPTY_NEW: NewProductForm = {
  name: "",
  category: "plastic-containers",
  type: "product",
  sellPrice: "",
  cost: "",
  platformPrice: "",
  stock: "10",
  platformName: "Meesho",
  platformUrl: "",
  description: "",
  images: [],
};

function toDraft(p: Product): Draft {
  return {
    cost: String(p.cost),
    sellPrice: String(p.sellPrice),
    platformPrice: String(p.platformPrice),
    stock: String(p.stock),
    commissionPercent:
      p.commissionPercent === null ? "" : String(p.commissionPercent),
    images: [...p.images],
  };
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ProductTable({
  initialProducts,
  initialCategories,
  settings,
  counts: initialCounts,
}: {
  initialProducts: Product[];
  initialCategories: CategoryDef[];
  settings: Settings;
  counts: Counts;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [counts, setCounts] = useState(initialCounts);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initialProducts.map((p) => [p.id, toDraft(p)]))
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "product" | "pack">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState<NewProductForm>(EMPTY_NEW);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "all" && p.type !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.platformName.toLowerCase().includes(q)
      );
    });
  }, [products, query, filter]);

  function updateDraft(id: string, key: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  function updateImages(id: string, images: string[]) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], images } }));
  }

  function refreshCounts(list: Product[]) {
    setCounts({
      products: list.length,
      packs: list.filter((p) => p.type === "pack").length,
      onlyProducts: list.filter((p) => p.type === "product").length,
    });
  }

  function metrics(draft: Draft) {
    const cost = Number(draft.cost) || 0;
    const sell = Number(draft.sellPrice) || 0;
    const profit = calcProfit(cost, sell);
    const commissionPct =
      draft.commissionPercent.trim() === ""
        ? settings.defaultCommissionPercent
        : Number(draft.commissionPercent) || 0;
    const commission = commissionAmount(sell, commissionPct);
    return { profit, commissionPct, commission };
  }

  function coverSrc(draft: Draft, product: Product) {
    return draft.images[0] || product.images[0] || "/products/appliance-1.svg";
  }

  function saveRow(id: string) {
    const draft = drafts[id];
    if (!draft) return;

    const body = {
      cost: Number(draft.cost) || 0,
      sellPrice: Number(draft.sellPrice) || 0,
      platformPrice: Number(draft.platformPrice) || 0,
      stock: Math.max(0, Math.floor(Number(draft.stock) || 0)),
      commissionPercent:
        draft.commissionPercent.trim() === ""
          ? null
          : Math.min(100, Math.max(0, Number(draft.commissionPercent) || 0)),
      images: draft.images,
    };

    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(err?.error || "Save failed. Try again.");
        return;
      }
      const data = (await res.json()) as { product: Product };
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? data.product : p))
      );
      setDrafts((prev) => ({ ...prev, [id]: toDraft(data.product) }));
      setMessage("Saved.");
    });
  }

  function createProduct() {
    if (!newForm.name.trim()) {
      setMessage("Enter a product name.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name.trim(),
          category: newForm.category,
          type: newForm.type,
          description: newForm.description.trim(),
          images: newForm.images,
          cost: Number(newForm.cost) || 0,
          sellPrice: Number(newForm.sellPrice) || 0,
          platformPrice:
            Number(newForm.platformPrice) || Number(newForm.cost) || 0,
          stock: Math.max(0, Math.floor(Number(newForm.stock) || 0)),
          platformName: newForm.platformName.trim() || "Meesho",
          platformUrl: newForm.platformUrl.trim(),
        }),
      });
      const data = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok || !data.product) {
        setMessage(data.error || "Could not add product.");
        return;
      }
      setProducts((prev) => {
        const next = [data.product!, ...prev];
        refreshCounts(next);
        return next;
      });
      setDrafts((prev) => ({
        ...prev,
        [data.product!.id]: toDraft(data.product!),
      }));
      setNewForm(EMPTY_NEW);
      setShowAdd(false);
      setEditingId(null);
      setMessage("Product added.");
    });
  }

  function createCategory() {
    const label = newCategoryName.trim();
    if (!label) {
      setCategoryError("Enter a category name.");
      return;
    }
    if (label.length > 60) {
      setCategoryError("Category name must be 60 characters or fewer.");
      return;
    }

    startTransition(async () => {
      setCategoryError(null);

      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label }),
        });
        const data = (await res.json().catch(() => null)) as {
          category?: CategoryDef;
          categories?: CategoryDef[];
          error?: string;
        } | null;

        if (!res.ok || !data?.category) {
          setCategoryError(data?.error || "Could not add category.");
          return;
        }

        const category = data.category;
        setCategories((current) =>
          data.categories ??
          [...current, category].sort((a, b) =>
            a.label.localeCompare(b.label)
          )
        );
        setNewForm((form) => ({ ...form, category: category.slug }));
        setNewCategoryName("");
        setIsAddingCategory(false);
        setMessage(`Category "${category.label}" selected.`);
      } catch {
        setCategoryError("Could not add category. Check your connection.");
      }
    });
  }

  return (
    <div className="fade-up space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            Products & packs
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted sm:text-[13px]">
            Manage catalog, pricing, and fulfillment links. Customers never see
            source URLs.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary min-h-10 w-full shrink-0 sm:w-auto"
          onClick={() => {
            setShowAdd((v) => {
              if (!v) setNewForm(EMPTY_NEW);
              return !v;
            });
            setMessage(null);
          }}
        >
          <i className="fa-solid fa-plus" aria-hidden />
          Add product
        </button>
      </div>

      <div className="rounded-[6px] border border-border bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="input-search-wrap lg:max-w-sm lg:flex-1">
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              className="input-search"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <div className="chips-scroll lg:ml-auto">
            {(
              [
                ["all", `All (${counts.products})`],
                ["product", `Products (${counts.onlyProducts})`],
                ["pack", `Packs (${counts.packs})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={cn("pill shrink-0", filter === key && "active")}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "text-[13px]",
            /fail|Could|Enter/i.test(message)
              ? "text-[var(--danger)]"
              : "text-success"
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}

      {showAdd ? (
        <section className="rounded-[6px] border border-border bg-white p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-[15px] font-semibold">New product</h2>
            <button
              type="button"
              className="btn btn-ghost h-9 px-2.5"
              onClick={() => setShowAdd(false)}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark" aria-hidden />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name *" className="sm:col-span-2">
              <input
                className="input"
                value={newForm.name}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Product name"
              />
            </Field>
            <Field label="Category *">
              <select
                className="input"
                value={newForm.category}
                onChange={(e) => {
                  if (e.target.value === "__add_custom__") {
                    setIsAddingCategory(true);
                    setCategoryError(null);
                    return;
                  }
                  setNewForm((form) => ({
                    ...form,
                    category: e.target.value,
                  }));
                }}
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.label}
                  </option>
                ))}
                <option value="__add_custom__">+ Add custom category</option>
              </select>
            </Field>
            {isAddingCategory ? (
              <div className="rounded-[6px] border border-border bg-surface/40 p-3 sm:col-span-2 lg:col-span-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label="New category name" className="flex-1">
                    <input
                      className="input"
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        setCategoryError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          createCategory();
                        }
                      }}
                      placeholder="For example, Serving Trays"
                      maxLength={60}
                      autoFocus
                    />
                  </Field>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost min-h-10 flex-1 sm:flex-none"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                        setCategoryError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary min-h-10 flex-1 sm:flex-none"
                      disabled={pending}
                      onClick={createCategory}
                    >
                      Add category
                    </button>
                  </div>
                </div>
                {categoryError ? (
                  <p
                    className="mt-2 text-[12px] text-[var(--danger)]"
                    role="alert"
                  >
                    {categoryError}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Field label="Type">
              <select
                className="input"
                value={newForm.type}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    type: e.target.value as "product" | "pack",
                  }))
                }
              >
                <option value="product">Product</option>
                <option value="pack">Pack</option>
              </select>
            </Field>
            <Field label="Sell ₹">
              <input
                className="input"
                value={newForm.sellPrice}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, sellPrice: e.target.value }))
                }
                inputMode="decimal"
              />
            </Field>
            <Field label="Cost ₹">
              <input
                className="input"
                value={newForm.cost}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, cost: e.target.value }))
                }
                inputMode="decimal"
              />
            </Field>
            <Field label="Source ₹">
              <input
                className="input"
                value={newForm.platformPrice}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, platformPrice: e.target.value }))
                }
                inputMode="decimal"
              />
            </Field>
            <Field label="Stock">
              <input
                className="input"
                value={newForm.stock}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, stock: e.target.value }))
                }
                inputMode="numeric"
              />
            </Field>
            <Field label="Source name">
              <input
                className="input"
                value={newForm.platformName}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, platformName: e.target.value }))
                }
              />
            </Field>
            <Field label="Fulfill URL" className="sm:col-span-2">
              <input
                className="input"
                value={newForm.platformUrl}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, platformUrl: e.target.value }))
                }
                placeholder="https://www.meesho.com/..."
              />
            </Field>
            <Field label="Description" className="sm:col-span-2 lg:col-span-3">
              <textarea
                className="input min-h-[72px] resize-y"
                value={newForm.description}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </Field>
          </div>

          <div className="mt-4 rounded-[6px] border border-border bg-surface/40 p-3 sm:p-4">
            <ImageGalleryEditor
              images={newForm.images}
              disabled={pending}
              onChange={(images) => setNewForm((f) => ({ ...f, images }))}
            />
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn btn-ghost min-h-10"
              onClick={() => {
                setShowAdd(false);
                setNewForm(EMPTY_NEW);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary min-h-10"
              disabled={pending}
              onClick={createProduct}
            >
              Create product
            </button>
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        {filtered.map((product) => {
          const draft = drafts[product.id] ?? toDraft(product);
          const { profit, commissionPct, commission } = metrics(draft);
          const src = coverSrc(draft, product);
          const open = editingId === product.id;

          return (
            <article
              key={product.id}
              className={cn(
                "overflow-hidden rounded-[6px] border border-border bg-white shadow-[var(--shadow-sm)]",
                open && "border-[color-mix(in_srgb,var(--theme)_35%,var(--border))]"
              )}
            >
              {/* Summary row */}
              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] border border-border bg-surface sm:h-16 sm:w-16">
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized={isUnoptimizedImage(src)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[14px] font-semibold text-foreground sm:text-[15px]">
                      {product.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <span className="rounded-[4px] bg-surface px-1.5 py-0.5 capitalize">
                        {product.type}
                      </span>
                      <span className="rounded-[4px] bg-surface px-1.5 py-0.5">
                        {categoryLabel(product.category, categories)}
                      </span>
                      <span
                        className={cn(
                          "rounded-[4px] px-1.5 py-0.5 capitalize",
                          product.status === "active"
                            ? "bg-[#ecfdf5] text-success"
                            : "bg-surface text-muted"
                        )}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-[6px] bg-surface px-3 py-2 text-center sm:flex sm:items-center sm:gap-5 sm:bg-transparent sm:px-0 sm:py-0 sm:text-left">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                      Sell
                    </p>
                    <p className="text-[13px] font-semibold">
                      {formatINR(Number(draft.sellPrice) || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                      Stock
                    </p>
                    <p className="text-[13px] font-semibold">{draft.stock}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                      Profit
                    </p>
                    <p className="text-[13px] font-semibold text-success">
                      {formatINRPrecise(profit)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <a
                    className="btn btn-ghost min-h-10 flex-1 px-3 sm:flex-none"
                    href={`/product/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fa-solid fa-store" aria-hidden />
                    <span className="sm:hidden">Store</span>
                  </a>
                  <button
                    type="button"
                    className={cn(
                      "btn min-h-10 flex-1 px-4 sm:flex-none",
                      open ? "btn-ghost" : "btn-primary"
                    )}
                    onClick={() =>
                      setEditingId((cur) =>
                        cur === product.id ? null : product.id
                      )
                    }
                  >
                    <i
                      className={cn(
                        "fa-solid",
                        open ? "fa-chevron-up" : "fa-pen"
                      )}
                      aria-hidden
                    />
                    {open ? "Close" : "Edit"}
                  </button>
                </div>
              </div>

              {/* Full-width editor */}
              {open ? (
                <div className="border-t border-border bg-[color-mix(in_srgb,var(--surface)_65%,#fff)] p-3 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <section className="rounded-[6px] border border-border bg-white p-3 sm:p-4">
                      <ImageGalleryEditor
                        images={draft.images}
                        disabled={pending}
                        onChange={(images) => updateImages(product.id, images)}
                      />
                    </section>

                    <section className="space-y-4 rounded-[6px] border border-border bg-white p-3 sm:p-4">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">
                          Pricing & stock
                        </p>
                        <p className="text-[12px] text-muted">
                          Source price is admin-only
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Cost ₹">
                          <input
                            className="input"
                            value={draft.cost}
                            onChange={(e) =>
                              updateDraft(product.id, "cost", e.target.value)
                            }
                            inputMode="decimal"
                          />
                        </Field>
                        <Field label="Sell ₹">
                          <input
                            className="input"
                            value={draft.sellPrice}
                            onChange={(e) =>
                              updateDraft(
                                product.id,
                                "sellPrice",
                                e.target.value
                              )
                            }
                            inputMode="decimal"
                          />
                        </Field>
                        <Field label="Source ₹">
                          <input
                            className="input"
                            value={draft.platformPrice}
                            onChange={(e) =>
                              updateDraft(
                                product.id,
                                "platformPrice",
                                e.target.value
                              )
                            }
                            inputMode="decimal"
                          />
                        </Field>
                        <Field label="Stock">
                          <input
                            className="input"
                            value={draft.stock}
                            onChange={(e) =>
                              updateDraft(product.id, "stock", e.target.value)
                            }
                            inputMode="numeric"
                          />
                        </Field>
                      </div>

                      <div className="rounded-[6px] bg-surface px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-muted">Profit</span>
                          <span className="font-semibold text-success">
                            {formatINRPrecise(profit)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[12px] text-muted">
                            Commission ({commissionPct}%)
                          </span>
                          <span className="text-[13px] font-medium">
                            {formatINRPrecise(commission)}
                          </span>
                        </div>
                      </div>

                      <Field
                        label={`Commission % (blank = default ${settings.defaultCommissionPercent}%)`}
                      >
                        <input
                          className="input max-w-[160px]"
                          value={draft.commissionPercent}
                          placeholder={String(settings.defaultCommissionPercent)}
                          onChange={(e) =>
                            updateDraft(
                              product.id,
                              "commissionPercent",
                              e.target.value
                            )
                          }
                          inputMode="decimal"
                        />
                      </Field>
                      <p className="text-[11px] text-muted">
                        Default until save:{" "}
                        {effectiveCommission(product, settings)}%
                      </p>

                      {product.platformUrl ? (
                        <a
                          href={product.platformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-theme"
                        >
                          Fulfill via {product.platformName || "source"}
                          <i
                            className="fa-solid fa-arrow-up-right-from-square text-[10px]"
                            aria-hidden
                          />
                        </a>
                      ) : null}

                      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          className="btn btn-ghost min-h-10"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary min-h-10"
                          disabled={pending}
                          onClick={() => saveRow(product.id)}
                        >
                          <i className="fa-solid fa-check" aria-hidden />
                          Save changes
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border bg-white px-4 py-12 text-center text-muted">
            No products match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
