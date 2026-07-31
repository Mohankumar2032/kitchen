"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TrackOrderForm({
  initialId = "",
}: {
  initialId?: string;
}) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(initialId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const id = orderId.trim();
    if (!id) {
      setError("Enter your order ID.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        `/api/orders/track?id=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as {
        order?: { id: string };
        error?: string;
      } | null;

      if (!res.ok || !data?.order?.id) {
        setError(data?.error || "Order not found. Check the ID and try again.");
        return;
      }

      router.push(`/order/${data.order.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-5 sm:p-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight sm:text-[24px]">
          Track order
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Enter your order ID to view payment QR, UTR status, and shipping
          progress.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">Order ID</span>
        <input
          className="input"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="e.g. ord-m5k2abc"
          autoComplete="off"
          autoFocus
        />
      </label>

      {error ? (
        <p className="text-[13px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary min-h-10 w-full"
        disabled={pending}
      >
        {pending ? "Looking up…" : "Track order"}
      </button>
    </form>
  );
}
