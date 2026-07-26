"use client";

import { useState } from "react";
import type { PublicProduct } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCart } from "./CartProvider";

export function AddToCartButton({
  product,
  compact = false,
  className,
}: {
  product: PublicProduct;
  compact?: boolean;
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const disabled = product.stock <= 0;

  function onAdd() {
    if (disabled) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] || "/products/appliance.svg",
      sellPrice: product.sellPrice,
      stock: product.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <button
      type="button"
      className={cn(
        "btn",
        compact ? "btn-ghost px-2 py-1" : "btn-primary",
        className
      )}
      disabled={disabled}
      onClick={onAdd}
    >
      <i
        className={`fa-solid ${added ? "fa-check" : "fa-cart-plus"}`}
        aria-hidden
      />
      {compact ? (
        added ? "Added" : "Add"
      ) : disabled ? (
        "Out of stock"
      ) : added ? (
        <>
          <span className="sm:hidden">Added</span>
          <span className="hidden sm:inline">Added to cart</span>
        </>
      ) : (
        <>
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add to cart</span>
        </>
      )}
    </button>
  );
}
