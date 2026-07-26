"use client";

import Image from "next/image";
import { Fragment, useMemo, useState, useTransition } from "react";
import { ImageGalleryEditor } from "@/components/admin/ImageGalleryEditor";
import { isUnoptimizedImage } from "@/lib/images";
import type { Product, Settings } from "@/lib/types";
import {
  calcProfit,
  commissionAmount,
  effectiveCommission,
} from "@/lib/types";
import { cn, formatINRPrecise } from "@/lib/utils";

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

export function ProductTable({
  initialProducts,
  settings,
  counts,
}: {
  initialProducts: Product[];
  settings: Settings;
  counts: Counts;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initialProducts.map((p) => [p.id, toDraft(p)]))
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "product" | "pack">("all");
  const [openCommissionId, setOpenCommissionId] = useState<string | null>(null);
  const [openImagesId, setOpenImagesId] = useState<string | null>(null);
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
        setMessage("Save failed. Try again.");
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

  return (
    <div className="fade-up space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Products & packs
          </h1>
          <p className="mt-1 max-w-2xl text-muted">
            List products for your store. Source links (Meesho / others) are
            admin-only — customers never see them. When an order comes in,
            fulfill manually from the source.
          </p>
        </div>
        <button type="button" className="btn btn-primary" disabled title="Coming after DB setup">
          <i className="fa-solid fa-plus" aria-hidden />
          Add product
        </button>
      </div>

      <div className="relative">
        <i
          className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          className="input pl-9"
          placeholder="Search by name, id, category..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn("pill", filter === "all" && "active")}
          onClick={() => setFilter("all")}
        >
          All ({counts.products})
        </button>
        <button
          type="button"
          className={cn("pill", filter === "product" && "active")}
          onClick={() => setFilter("product")}
        >
          Products ({counts.onlyProducts})
        </button>
        <button
          type="button"
          className={cn("pill", filter === "pack" && "active")}
          onClick={() => setFilter("pack")}
        >
          Packs ({counts.packs})
        </button>
      </div>

      {message ? (
        <p className="text-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[6px] border border-border">
        <table className="card-table min-w-[980px]">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>COST ₹</th>
              <th>SELL ₹</th>
              <th>SOURCE ₹</th>
              <th>STOCK</th>
              <th>PROFIT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const draft = drafts[product.id] ?? toDraft(product);
              const cost = Number(draft.cost) || 0;
              const sell = Number(draft.sellPrice) || 0;
              const profit = calcProfit(cost, sell);
              const commissionPct =
                draft.commissionPercent.trim() === ""
                  ? settings.defaultCommissionPercent
                  : Number(draft.commissionPercent) || 0;
              const commission = commissionAmount(sell, commissionPct);

              return (
                <Fragment key={product.id}>
                <tr>
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-surface"
                        title="Edit images"
                        onClick={() =>
                          setOpenImagesId((cur) =>
                            cur === product.id ? null : product.id
                          )
                        }
                      >
                        <Image
                          src={
                            draft.images[0] ||
                            product.images[0] ||
                            "/products/appliance-1.svg"
                          }
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized={isUnoptimizedImage(
                            draft.images[0] ||
                              product.images[0] ||
                              "/products/appliance-1.svg"
                          )}
                        />
                      </button>
                      <div>
                        <div className="font-medium text-foreground">
                          {product.name}
                        </div>
                        <div className="text-muted">
                          {product.type} • {product.category} • {product.status}
                          {" • "}
                          {draft.images.length} img
                        </div>
                        <a
                          href={product.platformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-theme hover:text-theme"
                          title="Open source listing to fulfill orders"
                        >
                          Fulfill via {product.platformName || "source"}
                          <i
                            className="fa-solid fa-arrow-up-right-from-square ml-1 text-[11px]"
                            aria-hidden
                          />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      className="input w-24"
                      value={draft.cost}
                      onChange={(e) =>
                        updateDraft(product.id, "cost", e.target.value)
                      }
                      inputMode="decimal"
                    />
                  </td>
                  <td>
                    <input
                      className="input w-24"
                      value={draft.sellPrice}
                      onChange={(e) =>
                        updateDraft(product.id, "sellPrice", e.target.value)
                      }
                      inputMode="decimal"
                    />
                  </td>
                  <td>
                    <input
                      className="input w-24"
                      value={draft.platformPrice}
                      onChange={(e) =>
                        updateDraft(
                          product.id,
                          "platformPrice",
                          e.target.value
                        )
                      }
                      inputMode="decimal"
                      title="Source platform price (admin only, not shown to customers)"
                    />
                  </td>
                  <td>
                    <input
                      className="input w-20"
                      value={draft.stock}
                      onChange={(e) =>
                        updateDraft(product.id, "stock", e.target.value)
                      }
                      inputMode="numeric"
                    />
                  </td>
                  <td>
                    <span className="font-medium text-success">
                      {formatINRPrecise(profit)} profit
                    </span>
                    <div className="text-muted">
                      Comm {commissionPct}% = {formatINRPrecise(commission)}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        className="btn btn-ghost"
                        href={`/product/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View store
                      </a>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={pending}
                        onClick={() => saveRow(product.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        title="Images"
                        onClick={() =>
                          setOpenImagesId((cur) =>
                            cur === product.id ? null : product.id
                          )
                        }
                      >
                        <i className="fa-solid fa-images" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        title="Commission %"
                        onClick={() =>
                          setOpenCommissionId((cur) =>
                            cur === product.id ? null : product.id
                          )
                        }
                      >
                        <i className="fa-solid fa-percent" aria-hidden />
                      </button>
                    </div>
                    {openCommissionId === product.id ? (
                      <div className="mt-2 rounded-[6px] border border-border bg-surface p-2">
                        <label className="mb-1 block text-muted">
                          Commission % (blank = default{" "}
                          {settings.defaultCommissionPercent}%)
                        </label>
                        <input
                          className="input w-28"
                          value={draft.commissionPercent}
                          placeholder={String(
                            settings.defaultCommissionPercent
                          )}
                          onChange={(e) =>
                            updateDraft(
                              product.id,
                              "commissionPercent",
                              e.target.value
                            )
                          }
                          inputMode="decimal"
                        />
                        <div className="mt-1 text-muted">
                          Effective:{" "}
                          {effectiveCommission(product, settings)}% default
                          shown until save
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
                {openImagesId === product.id ? (
                  <tr>
                    <td colSpan={7} className="!bg-surface">
                      <ImageGalleryEditor
                        images={draft.images}
                        disabled={pending}
                        onChange={(images) => updateImages(product.id, images)}
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={pending}
                          onClick={() => saveRow(product.id)}
                        >
                          Save images & prices
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  No products match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
