"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { PublicOrder, Settings } from "@/lib/types";
import { buildUpiPayUrl, isValidUtr, normalizeUtr } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

type Step = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
};

function buildSteps(order: PublicOrder): Step[] {
  const placed = true;
  const paymentDone =
    order.paymentStatus === "submitted" || order.paymentStatus === "verified";
  const confirmed =
    order.paymentStatus === "verified" ||
    order.status === "confirmed" ||
    order.status === "fulfilling" ||
    order.status === "shipped";
  const shipped = order.status === "shipped";
  const cancelled = order.status === "cancelled";

  if (cancelled) {
    return [
      { key: "placed", label: "Placed", done: true, current: false },
      { key: "cancelled", label: "Cancelled", done: true, current: true },
    ];
  }

  const steps: Step[] = [
    { key: "placed", label: "Placed", done: placed, current: !paymentDone },
    {
      key: "payment",
      label: "Payment submitted",
      done: paymentDone,
      current: paymentDone && !confirmed,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      done: confirmed,
      current: confirmed && !shipped,
    },
    {
      key: "shipped",
      label: "Shipped",
      done: shipped,
      current: shipped,
    },
  ];
  return steps;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function OrderPaymentPanel({
  initialOrder,
  settings,
}: {
  initialOrder: PublicOrder;
  settings: Settings;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState(initialOrder.utr || "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const payAmount = order.total;
  const upiUrl = useMemo(
    () =>
      buildUpiPayUrl({
        upiId: settings.upiId,
        payee: settings.upiPayee,
        amount: payAmount,
        note: order.id,
      }),
    [settings.upiId, settings.upiPayee, payAmount, order.id]
  );

  useEffect(() => {
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
  }, [upiUrl]);

  const steps = buildSteps(order);
  const isVerified = order.paymentStatus === "verified";
  const canEditUtr = !isVerified && order.status !== "cancelled";

  async function onCopy(label: string, value: string) {
    const ok = await copyText(value);
    if (ok) {
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    }
  }

  async function onSubmitUtr(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isValidUtr(utrInput)) {
      setError("UTR must be 8–22 letters/numbers (no spaces).");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: normalizeUtr(utrInput) }),
      });
      const data = (await res.json().catch(() => null)) as {
        order?: PublicOrder;
        error?: string;
      } | null;
      if (!res.ok || !data?.order) {
        setError(data?.error || "Could not save UTR.");
        return;
      }
      setOrder(data.order);
      setUtrInput(data.order.utr || "");
      setMessage("UTR submitted. We will verify your payment shortly.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fade-up space-y-4">
      <div className="panel p-5 text-center sm:p-6">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ecfdf5] text-success">
          <i className="fa-solid fa-circle-check text-xl" aria-hidden />
        </span>
        <h1 className="mt-3 text-[22px] font-bold tracking-tight sm:text-[24px]">
          Order placed!
        </h1>
        <p className="mt-1 text-muted">
          Order ID:{" "}
          <span className="font-semibold text-foreground">{order.id}</span>
        </p>
        <p className="mt-1 text-[13px] text-muted">
          Payment UTR received · Shipping to {order.city}, {order.state}
        </p>
      </div>

      <div className="panel p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Order status
        </p>
        <ol className="grid gap-2 sm:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.key}
              className={cn(
                "rounded-[6px] border px-3 py-2 text-[12px] font-medium",
                step.done || step.current
                  ? "border-[color-mix(in_srgb,var(--theme)_35%,var(--border))] bg-[color-mix(in_srgb,var(--theme)_8%,#fff)] text-theme"
                  : "border-border bg-surface text-muted"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <i
                  className={cn(
                    "fa-solid text-[10px]",
                    step.done ? "fa-check" : "fa-circle"
                  )}
                  aria-hidden
                />
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {order.status !== "cancelled" ? (
        <div className="panel overflow-hidden p-0">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-[6px] border border-border bg-white px-3 py-3">
              <div className="flex justify-between gap-3 text-[13px] text-muted">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  {formatINR(order.subtotal)}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between gap-3 text-[13px] text-muted">
                <span>Shipping</span>
                <span className="font-medium text-foreground">
                  {order.shipping === 0 ? "Free" : formatINR(order.shipping)}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t border-border pt-2 text-[15px] font-bold">
                <span>Paid</span>
                <span className="text-theme">{formatINR(payAmount)}</span>
              </div>
            </div>

            {isVerified ? (
              <div className="rounded-[6px] border border-[#bbf7d0] bg-[#ecfdf5] px-4 py-3 text-[13px] text-success">
                Payment verified. We are preparing your order.
                {order.utr ? (
                  <span className="mt-1 block font-medium text-foreground">
                    UTR: {order.utr}
                  </span>
                ) : null}
              </div>
            ) : order.paymentStatus === "submitted" ? (
              <div className="rounded-[6px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[13px] text-[color-mix(in_srgb,var(--theme)_70%,#9a3412)]">
                UTR submitted. We will verify payment and confirm your order.
                {order.utr ? (
                  <span className="mt-1 block font-medium text-foreground">
                    UTR: {order.utr}
                  </span>
                ) : null}
                {canEditUtr ? (
                  <form onSubmit={onSubmitUtr} className="mt-3 space-y-2">
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-semibold text-foreground">
                        Update UTR
                      </span>
                      <input
                        className="input"
                        value={utrInput}
                        onChange={(e) =>
                          setUtrInput(e.target.value.replace(/\s+/g, ""))
                        }
                        placeholder="e.g. 123456789012"
                        maxLength={22}
                        disabled={pending}
                        autoComplete="off"
                      />
                    </label>
                    {error ? (
                      <p className="text-[13px] text-[var(--danger)]" role="alert">
                        {error}
                      </p>
                    ) : null}
                    {message ? (
                      <p className="text-[13px] text-success" role="status">
                        {message}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      className="btn btn-ghost min-h-9 px-3 text-[12px]"
                      disabled={pending}
                    >
                      {pending ? "Saving…" : "Update UTR"}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              <>
                <div className="border-b border-[color-mix(in_srgb,var(--theme)_25%,#fed7aa)] bg-[color-mix(in_srgb,var(--theme)_8%,#fff7ed)] -mx-4 sm:-mx-5 px-4 py-2.5 text-[13px] font-medium text-[color-mix(in_srgb,var(--theme)_70%,#9a3412)]">
                  Choose any QR code, UPI ID, or mobile number.
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
                    <DetailRow
                      label="UPI ID"
                      value={settings.upiId}
                      onCopy={() => onCopy("upi", settings.upiId)}
                      copied={copied === "upi"}
                    />
                    <DetailRow
                      label="Mobile"
                      value={settings.upiMobile}
                      onCopy={() => onCopy("mobile", settings.upiMobile)}
                      copied={copied === "mobile"}
                    />
                    <DetailRow label="Payee" value={settings.upiPayee} />
                    <DetailRow
                      label="Amount"
                      value={formatINR(payAmount)}
                      onCopy={() => onCopy("amount", String(payAmount))}
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

                <form onSubmit={onSubmitUtr} className="space-y-2 border-t border-border pt-4">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-foreground">
                      UTR / UPI reference number
                    </span>
                    <input
                      className="input"
                      value={utrInput}
                      onChange={(e) =>
                        setUtrInput(e.target.value.replace(/\s+/g, ""))
                      }
                      placeholder="e.g. 123456789012"
                      maxLength={22}
                      disabled={!canEditUtr || pending}
                      autoComplete="off"
                      inputMode="text"
                    />
                  </label>
                  <p className="text-[11px] text-muted">
                    8–22 characters, letters and numbers only (no spaces).
                  </p>
                  {error ? (
                    <p className="text-[13px] text-[var(--danger)]" role="alert">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="text-[13px] text-success" role="status">
                      {message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    className="btn btn-primary min-h-10 w-full sm:w-auto"
                    disabled={!canEditUtr || pending}
                  >
                    {pending ? "Saving…" : "Submit UTR"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="panel p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Order details</h2>
        <ul className="mt-3 space-y-2">
          {order.items.map((item) => (
            <li
              key={`${item.productId}-${item.productName}`}
              className="flex justify-between gap-2 border-b border-border pb-2 text-muted last:border-0"
            >
              <span>
                {item.productName} × {item.qty}
              </span>
              <span className="font-medium text-foreground">
                {formatINR(item.sellPrice * item.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-[13px]">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatINR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Shipping</span>
            <span>
              {order.shipping === 0 ? "Free" : formatINR(order.shipping)}
            </span>
          </div>
          <div className="flex justify-between pt-1 text-[15px] font-bold">
            <span>Total</span>
            <span className="text-theme">{formatINR(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/shop" className="btn btn-primary">
          Continue shopping
        </Link>
        <Link href="/track" className="btn btn-ghost">
          Track another order
        </Link>
      </div>
    </div>
  );
}

function DetailRow({
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
