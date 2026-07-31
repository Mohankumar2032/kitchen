"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useCart } from "@/components/storefront/CartProvider";
import type { Settings } from "@/lib/types";
import {
  buildUpiPayUrl,
  computeShipping,
  isValidUtr,
  normalizeUtr,
} from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

type ShippingDraft = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
};

const EMPTY_SHIPPING: ShippingDraft = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  notes: "",
};

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function CheckoutForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();
  const [step, setStep] = useState<"details" | "payment">("details");
  const [shipping, setShipping] = useState<ShippingDraft>(EMPTY_SHIPPING);
  const [utr, setUtr] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const shippingFee = computeShipping(subtotal, settings);
  const total = subtotal + shippingFee;

  const upiNote = useMemo(() => {
    const phone = shipping.customerPhone.replace(/\D/g, "").slice(-4);
    return phone ? `Kitchen-${phone}` : "Kitchen-order";
  }, [shipping.customerPhone]);

  const upiUrl = useMemo(
    () =>
      buildUpiPayUrl({
        upiId: settings.upiId,
        payee: settings.upiPayee,
        amount: total,
        note: upiNote,
      }),
    [settings.upiId, settings.upiPayee, total, upiNote]
  );

  useEffect(() => {
    if (step !== "payment") return;
    let cancelled = false;
    void QRCode.toDataURL(upiUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [step, upiUrl]);

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

  function onContinueToPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const next: ShippingDraft = {
      customerName: String(form.get("customerName") || "").trim(),
      customerPhone: String(form.get("customerPhone") || "").trim(),
      customerEmail: String(form.get("customerEmail") || "").trim(),
      addressLine1: String(form.get("addressLine1") || "").trim(),
      addressLine2: String(form.get("addressLine2") || "").trim(),
      city: String(form.get("city") || "").trim(),
      state: String(form.get("state") || "").trim(),
      pincode: String(form.get("pincode") || "").trim(),
      notes: String(form.get("notes") || "").trim(),
    };

    if (
      !next.customerName ||
      !next.customerPhone ||
      !next.addressLine1 ||
      !next.city ||
      !next.state ||
      !next.pincode
    ) {
      setError("Complete shipping details to continue.");
      return;
    }

    setShipping(next);
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onCopy(label: string, value: string) {
    const ok = await copyText(value);
    if (ok) {
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    }
  }

  async function onSubmitOrder(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidUtr(utr)) {
      setError("Enter your UTR after paying (8–22 letters/numbers, no spaces).");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shipping,
          utr: normalizeUtr(utr),
          items: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
          })),
        }),
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
        <span
          className={cn(
            "rounded-full px-3 py-1",
            step === "details"
              ? "bg-theme text-white"
              : "bg-surface text-muted"
          )}
        >
          1. Shipping
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1",
            step === "payment"
              ? "bg-theme text-white"
              : "bg-surface text-muted"
          )}
        >
          2. Pay & submit order
        </span>
      </div>

      {step === "details" ? (
        <form
          onSubmit={onContinueToPayment}
          className="grid gap-6 lg:grid-cols-[1fr_340px]"
        >
          <div className="panel space-y-4 p-4 sm:p-5">
            <h2 className="text-[16px] font-semibold">Shipping details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-muted">Full name *</span>
                <input
                  className="input"
                  name="customerName"
                  required
                  defaultValue={shipping.customerName}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-muted">Phone *</span>
                <input
                  className="input"
                  name="customerPhone"
                  required
                  inputMode="tel"
                  defaultValue={shipping.customerPhone}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-muted">Email</span>
                <input
                  className="input"
                  name="customerEmail"
                  type="email"
                  defaultValue={shipping.customerEmail}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-muted">Address line 1 *</span>
                <input
                  className="input"
                  name="addressLine1"
                  required
                  defaultValue={shipping.addressLine1}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-muted">Address line 2</span>
                <input
                  className="input"
                  name="addressLine2"
                  defaultValue={shipping.addressLine2}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-muted">City *</span>
                <input
                  className="input"
                  name="city"
                  required
                  defaultValue={shipping.city}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-muted">State *</span>
                <input
                  className="input"
                  name="state"
                  required
                  defaultValue={shipping.state}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-muted">Pincode *</span>
                <input
                  className="input"
                  name="pincode"
                  required
                  inputMode="numeric"
                  defaultValue={shipping.pincode}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-muted">Order notes</span>
                <textarea
                  className="input min-h-[90px]"
                  name="notes"
                  defaultValue={shipping.notes}
                />
              </label>
            </div>
            {error ? <p className="text-danger">{error}</p> : null}
          </div>

          <aside className="panel h-fit space-y-3 p-4 sm:p-5">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              total={total}
            />
            <p className="rounded-[6px] bg-surface px-3 py-2 text-[12px] text-muted">
              Next: pay via UPI QR, enter UTR, then submit the order.
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Continue to payment
            </button>
          </aside>
        </form>
      ) : (
        <form
          onSubmit={onSubmitOrder}
          className="grid gap-6 lg:grid-cols-[1fr_340px]"
        >
          <div className="panel overflow-hidden p-0">
            <div className="border-b border-[color-mix(in_srgb,var(--theme)_25%,#fed7aa)] bg-[color-mix(in_srgb,var(--theme)_8%,#fff7ed)] px-4 py-2.5 text-[13px] font-medium text-[color-mix(in_srgb,var(--theme)_70%,#9a3412)]">
              Pay first, then enter UTR and submit your order.
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-[6px] border border-border bg-white px-3 py-3">
                <div className="flex justify-between gap-3 text-[13px] text-muted">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">
                    {formatINR(subtotal)}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between gap-3 text-[13px] text-muted">
                  <span>Shipping</span>
                  <span className="font-medium text-foreground">
                    {shippingFee === 0 ? "Free" : formatINR(shippingFee)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between gap-3 border-t border-border pt-2 text-[15px] font-bold">
                  <span>Pay exactly</span>
                  <span className="text-theme">{formatINR(total)}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                <div className="mx-auto w-fit rounded-[6px] border border-border bg-white p-2">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="UPI payment QR code"
                      width={220}
                      height={220}
                      className="h-[200px] w-[200px] sm:h-[220px] sm:w-[220px]"
                    />
                  ) : (
                    <div className="flex h-[200px] w-[200px] items-center justify-center text-muted sm:h-[220px] sm:w-[220px]">
                      Loading QR…
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 text-[13px]">
                  <PayDetail
                    label="UPI ID"
                    value={settings.upiId}
                    onCopy={() => onCopy("upi", settings.upiId)}
                    copied={copied === "upi"}
                  />
                  <PayDetail
                    label="Mobile"
                    value={settings.upiMobile}
                    onCopy={() => onCopy("mobile", settings.upiMobile)}
                    copied={copied === "mobile"}
                  />
                  <PayDetail label="Payee" value={settings.upiPayee} />
                  <PayDetail
                    label="Amount"
                    value={formatINR(total)}
                    onCopy={() => onCopy("amount", String(total))}
                    copied={copied === "amount"}
                  />
                  <a
                    href={upiUrl}
                    className="btn btn-soft mt-1 inline-flex min-h-10 w-full sm:w-auto"
                  >
                    <i className="fa-solid fa-mobile-screen" aria-hidden />
                    Open UPI app
                  </a>
                </div>
              </div>

              <label className="block border-t border-border pt-4">
                <span className="mb-1 block text-[13px] font-semibold">
                  UTR / UPI reference number *
                </span>
                <input
                  className="input"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g. 123456789012"
                  maxLength={22}
                  autoComplete="off"
                  required
                />
                <span className="mt-1 block text-[11px] text-muted">
                  8–22 characters, letters and numbers only (no spaces). Order
                  submits only after this is entered.
                </span>
              </label>

              {error ? <p className="text-danger">{error}</p> : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  className="btn btn-ghost min-h-10"
                  onClick={() => {
                    setError(null);
                    setStep("details");
                  }}
                >
                  Back to shipping
                </button>
                <button
                  type="submit"
                  className="btn btn-primary min-h-10"
                  disabled={pending || !isValidUtr(utr)}
                >
                  {pending ? "Submitting order…" : "Submit order"}
                </button>
              </div>
            </div>
          </div>

          <aside className="panel h-fit space-y-3 p-4 sm:p-5">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              total={total}
            />
            <div className="rounded-[6px] bg-surface px-3 py-2 text-[12px] text-muted">
              <p className="font-semibold text-foreground">Ship to</p>
              <p className="mt-1">
                {shipping.customerName} · {shipping.customerPhone}
              </p>
              <p>
                {shipping.addressLine1}
                {shipping.addressLine2 ? `, ${shipping.addressLine2}` : ""}
              </p>
              <p>
                {shipping.city}, {shipping.state} — {shipping.pincode}
              </p>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}

function OrderSummary({
  items,
  subtotal,
  shippingFee,
  total,
}: {
  items: Array<{ productId: string; name: string; qty: number; sellPrice: number }>;
  subtotal: number;
  shippingFee: number;
  total: number;
}) {
  return (
    <>
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
      <div className="flex justify-between text-[13px] text-muted">
        <span>Subtotal</span>
        <span>{formatINR(subtotal)}</span>
      </div>
      <div className="flex justify-between text-[13px] text-muted">
        <span>Shipping</span>
        <span>{shippingFee === 0 ? "Free" : formatINR(shippingFee)}</span>
      </div>
      <div className="flex justify-between pt-1 text-[15px] font-bold">
        <span>Total</span>
        <span className="text-theme">{formatINR(total)}</span>
      </div>
    </>
  );
}

function PayDetail({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-[6px] border border-border bg-surface/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
          {label}
        </p>
        <p className="truncate font-semibold text-foreground">{value}</p>
      </div>
      {onCopy ? (
        <button
          type="button"
          className="btn btn-ghost h-8 shrink-0 px-2 text-[11px]"
          onClick={onCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}
    </div>
  );
}
