"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/storefront/CartProvider";
import { formatINR } from "@/lib/utils";

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <p className="text-muted">Loading…</p>;

  if (items.length === 0) {
    return (
      <div className="panel border-dashed p-8 text-center sm:p-12">
        <p className="text-[16px] font-semibold">Nothing to checkout</p>
        <Link href="/shop" className="btn btn-primary mt-4 inline-flex">
          Browse products
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      customerName: String(form.get("customerName") || ""),
      customerPhone: String(form.get("customerPhone") || ""),
      customerEmail: String(form.get("customerEmail") || ""),
      addressLine1: String(form.get("addressLine1") || ""),
      addressLine2: String(form.get("addressLine2") || ""),
      city: String(form.get("city") || ""),
      state: String(form.get("state") || ""),
      pincode: String(form.get("pincode") || ""),
      notes: String(form.get("notes") || ""),
      items: items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place order");
        setPending(false);
        return;
      }
      clear();
      router.push(`/order/${data.order.id}`);
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="panel space-y-4 p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Shipping details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-muted">Full name *</span>
            <input className="input" name="customerName" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">Phone *</span>
            <input
              className="input"
              name="customerPhone"
              required
              inputMode="tel"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">Email</span>
            <input className="input" name="customerEmail" type="email" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-muted">Address line 1 *</span>
            <input className="input" name="addressLine1" required />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-muted">Address line 2</span>
            <input className="input" name="addressLine2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">City *</span>
            <input className="input" name="city" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">State *</span>
            <input className="input" name="state" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">Pincode *</span>
            <input
              className="input"
              name="pincode"
              required
              inputMode="numeric"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-muted">Order notes</span>
            <textarea className="input min-h-[90px]" name="notes" />
          </label>
        </div>
        {error ? <p className="text-danger">{error}</p> : null}
      </div>

      <aside className="panel h-fit space-y-3 p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Your order</h2>
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex justify-between gap-2 border-b border-border pb-2 text-muted"
          >
            <span>
              {item.name} × {item.qty}
            </span>
            <span className="font-medium text-foreground">
              {formatINR(item.sellPrice * item.qty)}
            </span>
          </div>
        ))}
        <div className="flex justify-between pt-1 text-[15px] font-bold">
          <span>Total</span>
          <span className="text-theme">{formatINR(subtotal)}</span>
        </div>
        <p className="rounded-[6px] bg-surface px-3 py-2 text-muted">
          Payment: Cash on delivery / UPI on confirmation.
        </p>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={pending}
        >
          {pending ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
