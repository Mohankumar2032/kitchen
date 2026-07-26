"use client";

import Image from "next/image";
import Link from "next/link";
import { StoreShell } from "@/components/storefront/StoreShell";
import { useCart } from "@/components/storefront/CartProvider";
import { formatINR } from "@/lib/utils";

function CartContents() {
  const { items, subtotal, setQty, removeItem, ready } = useCart();

  if (!ready) {
    return <p className="text-muted">Loading cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="panel border-dashed p-8 text-center sm:p-12">
        <i className="fa-solid fa-cart-shopping mb-3 text-3xl text-theme" aria-hidden />
        <p className="text-[16px] font-semibold">Your cart is empty</p>
        <p className="mt-1 text-muted">Add products from the shop to continue.</p>
        <Link href="/shop" className="btn btn-primary mt-5 inline-flex">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.productId}
            className="panel flex flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4"
          >
            <Link
              href={`/product/${item.slug}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[6px] bg-surface"
            >
              <Image
                src={item.image}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-2"
                unoptimized={item.image.endsWith(".svg")}
              />
            </Link>
            <div className="min-w-[180px] flex-1">
              <Link
                href={`/product/${item.slug}`}
                className="text-[14px] font-semibold hover:text-theme"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-theme">{formatINR(item.sellPrice)}</p>
            </div>
            <div className="flex items-center rounded-[6px] border border-border">
              <button
                type="button"
                className="px-3 py-2 hover:bg-surface"
                onClick={() => setQty(item.productId, item.qty - 1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{item.qty}</span>
              <button
                type="button"
                className="px-3 py-2 hover:bg-surface disabled:opacity-40"
                onClick={() => setQty(item.productId, item.qty + 1)}
                disabled={item.qty >= item.stock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <div className="w-24 text-right font-bold">
              {formatINR(item.sellPrice * item.qty)}
            </div>
            <button
              type="button"
              className="btn btn-ghost text-danger"
              onClick={() => removeItem(item.productId)}
              aria-label="Remove item"
            >
              <i className="fa-solid fa-trash" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <aside className="panel h-fit p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Order summary</h2>
        <div className="mt-4 space-y-2 text-muted">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-foreground">
              {formatINR(subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-[15px] font-bold">
          <span>Total</span>
          <span className="text-theme">{formatINR(subtotal)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary mt-5 w-full">
          Proceed to checkout
        </Link>
        <Link href="/shop" className="btn btn-ghost mt-2 w-full">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

export default function CartPage() {
  return (
    <StoreShell>
      <main>
        <div className="container-store py-4 sm:py-6 lg:py-8">
          <h1 className="section-title mb-4 sm:mb-5">Your cart</h1>
          <CartContents />
        </div>
      </main>
    </StoreShell>
  );
}
