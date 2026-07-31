"use client";

import { useMemo, useState, useTransition } from "react";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";
import { orderItemProfit, orderProfit } from "@/lib/types";
import { cn, formatINR, formatINRPrecise } from "@/lib/utils";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  fulfilling: "Fulfilling",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  submitted: "Awaiting verify",
  verified: "Verified",
};

/** Simple one-click next step — avoids juggling two status dropdowns. */
function nextAction(
  order: Order
): {
  label: string;
  hint: string;
  body: { status?: OrderStatus; paymentStatus?: PaymentStatus };
  tone: "primary" | "success";
} | null {
  if (order.status === "cancelled" || order.status === "shipped") return null;

  const payment = paymentOf(order);

  if (payment === "submitted") {
    return {
      label: "1. Verify payment",
      hint: "Confirm UTR in your bank / UPI app, then tap once.",
      body: { paymentStatus: "verified", status: "confirmed" },
      tone: "primary",
    };
  }

  if (payment === "unpaid") {
    return {
      label: "Waiting for UTR",
      hint: "Customer has not submitted payment reference yet.",
      body: { status: "new" },
      tone: "primary",
    };
  }

  // payment verified
  if (order.status === "new" || order.status === "confirmed") {
    return {
      label: "2. Start fulfilling",
      hint: "Payment OK — order from Meesho / source next.",
      body: { status: "fulfilling" },
      tone: "primary",
    };
  }

  if (order.status === "fulfilling") {
    return {
      label: "3. Mark shipped",
      hint: "Package handed to courier / delivered to customer.",
      body: { status: "shipped" },
      tone: "success",
    };
  }

  return null;
}

const FLOW_STEPS = [
  { key: "pay", label: "Pay" },
  { key: "confirm", label: "Confirm" },
  { key: "fulfill", label: "Fulfill" },
  { key: "ship", label: "Ship" },
] as const;

function flowStepIndex(order: Order): number {
  if (order.status === "cancelled") return -1;
  if (order.status === "shipped") return 3;
  if (order.status === "fulfilling") return 2;
  if (
    paymentOf(order) === "verified" ||
    order.status === "confirmed"
  )
    return 1;
  if (paymentOf(order) === "submitted") return 0;
  return 0;
}

type FilterKey = "all" | "needs_verify" | OrderStatus;

function orderTotal(order: Order): number {
  return order.total ?? order.subtotal + (order.shipping || 0);
}

function paymentOf(order: Order): PaymentStatus {
  return order.paymentStatus || "unpaid";
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OrdersPanel({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const needsVerify = orders.filter(
      (o) => paymentOf(o) === "submitted"
    ).length;
    const verified = orders.filter((o) => paymentOf(o) === "verified").length;
    const revenue = active.reduce((sum, o) => sum + orderTotal(o), 0);
    const profit = active.reduce((sum, o) => sum + orderProfit(o), 0);
    return {
      total: orders.length,
      needsVerify,
      verified,
      revenue,
      profit: Math.round(profit * 100) / 100,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter === "needs_verify" && paymentOf(order) !== "submitted")
        return false;
      if (
        filter !== "all" &&
        filter !== "needs_verify" &&
        order.status !== filter
      )
        return false;
      if (!q) return true;
      const hay = [
        order.id,
        order.customerName,
        order.customerPhone,
        order.utr || "",
        order.city,
        order.pincode,
        ...order.items.map((i) => i.productName),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, filter]);

  function patchOrder(
    id: string,
    body: { status?: OrderStatus; paymentStatus?: PaymentStatus }
  ) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(err?.error || "Could not update order");
        return;
      }
      const data = (await res.json()) as { order: Order };
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          // Keep known line costs if API omits them (older orders).
          const prevCosts = new Map(
            o.items.map((item) => [item.productId, item.cost])
          );
          return {
            ...data.order,
            items: data.order.items.map((item) => ({
              ...item,
              cost:
                typeof item.cost === "number" && item.cost > 0
                  ? item.cost
                  : prevCosts.get(item.productId) ?? item.cost ?? 0,
            })),
          };
        })
      );
      setMessage("Order updated");
    });
  }

  return (
    <div className="fade-up space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            Orders
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted sm:text-[13px]">
            One button per step: Verify payment → Start fulfilling → Mark
            shipped. Open source links on items to buy from Meesho.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
        <StatCard
          label="Total orders"
          value={String(stats.total)}
          icon="fa-receipt"
        />
        <StatCard
          label="Needs UTR verify"
          value={String(stats.needsVerify)}
          icon="fa-clock"
          accent={stats.needsVerify > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Payment verified"
          value={String(stats.verified)}
          icon="fa-shield-halved"
          accent="ok"
        />
        <StatCard
          label="Revenue"
          value={formatINR(stats.revenue)}
          icon="fa-indian-rupee-sign"
        />
        <StatCard
          label="Profit"
          value={formatINRPrecise(stats.profit)}
          icon="fa-chart-line"
          accent={stats.profit >= 0 ? "ok" : "warn"}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="input-search-wrap lg:max-w-sm lg:flex-1">
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              className="input-search"
              placeholder="Search order ID, phone, name, UTR…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search orders"
            />
          </div>
          <div className="chips-scroll lg:ml-auto">
            {(
              [
                ["all", `All (${stats.total})`],
                ["needs_verify", `Verify UTR (${stats.needsVerify})`],
                ["new", "New"],
                ["confirmed", "Confirmed"],
                ["fulfilling", "Fulfilling"],
                ["shipped", "Shipped"],
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
            "text-[13px] font-medium",
            /fail|Could|Invalid/i.test(message)
              ? "text-[var(--danger)]"
              : "text-success"
          )}
          role="status"
        >
          <i
            className={cn(
              "fa-solid mr-1.5",
              /fail|Could|Invalid/i.test(message)
                ? "fa-circle-exclamation"
                : "fa-circle-check"
            )}
            aria-hidden
          />
          {message}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border bg-white px-4 py-14 text-center text-muted">
          <i
            className="fa-solid fa-bag-shopping mb-3 text-2xl text-theme"
            aria-hidden
          />
          <p className="font-semibold text-foreground">No orders yet</p>
          <p className="mt-1 text-[13px]">
            Place a test order from the shop to see it here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border bg-white px-4 py-12 text-center text-muted">
          No orders match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              pending={pending}
              onPatch={patchOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = "default",
}: {
  label: string;
  value: string;
  icon: string;
  accent?: "default" | "warn" | "ok";
}) {
  return (
    <div
      className={cn(
        "rounded-[6px] border bg-white px-3 py-3 sm:px-4",
        accent === "warn" && "border-[#fdba74] bg-[#fff7ed]",
        accent === "ok" && "border-[#86efac] bg-[#f0fdf4]",
        accent === "default" && "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
          {label}
        </p>
        <i
          className={cn(
            "fa-solid text-[12px]",
            icon,
            accent === "warn" && "text-[#c2410c]",
            accent === "ok" && "text-success",
            accent === "default" && "text-theme"
          )}
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-[18px] font-bold tracking-tight text-foreground sm:text-[20px]">
        {value}
      </p>
    </div>
  );
}

function OrderCard({
  order,
  pending,
  onPatch,
}: {
  order: Order;
  pending: boolean;
  onPatch: (
    id: string,
    body: { status?: OrderStatus; paymentStatus?: PaymentStatus }
  ) => void;
}) {
  const total = orderTotal(order);
  const paymentStatus = paymentOf(order);
  const action = nextAction(order);
  const stepIndex = flowStepIndex(order);
  const waitingForUtr =
    paymentStatus === "unpaid" && order.status !== "cancelled";
  const address = [
    order.addressLine1,
    order.addressLine2,
    `${order.city}, ${order.state} — ${order.pincode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="overflow-hidden rounded-[6px] border border-border bg-white shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-[6px] bg-[color-mix(in_srgb,var(--theme)_12%,#fff)] px-2.5 py-1 font-mono text-[12px] font-semibold text-theme">
              {order.id}
            </span>
            <StatusChip status={order.status} />
            <PaymentChip status={paymentStatus} />
          </div>
          <p className="text-[12px] text-muted">{formatWhen(order.createdAt)}</p>
          <div className="space-y-1 text-[13px]">
            <p className="font-semibold text-foreground">
              <i
                className="fa-solid fa-user mr-1.5 text-[11px] text-muted"
                aria-hidden
              />
              {order.customerName}
              <span className="font-normal text-muted">
                {" "}
                · {order.customerPhone}
              </span>
            </p>
            {order.customerEmail ? (
              <p className="text-muted">
                <i
                  className="fa-solid fa-envelope mr-1.5 text-[11px]"
                  aria-hidden
                />
                {order.customerEmail}
              </p>
            ) : null}
            <p className="leading-relaxed text-muted">
              <i
                className="fa-solid fa-location-dot mr-1.5 text-[11px]"
                aria-hidden
              />
              {address}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
            Order total
          </p>
          <p className="text-[20px] font-bold tracking-tight text-theme">
            {formatINRPrecise(total)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Items {formatINR(order.subtotal)}
            {order.shipping > 0
              ? ` + ship ${formatINR(order.shipping)}`
              : " · free ship"}
          </p>
          <p
            className={cn(
              "mt-1.5 text-[13px] font-semibold",
              orderProfit(order) >= 0 ? "text-success" : "text-[var(--danger)]"
            )}
          >
            Profit {formatINRPrecise(orderProfit(order))}
          </p>
        </div>
      </div>

      {/* Easy next-step workflow — one button, not two dropdowns */}
      <div className="border-b border-border bg-surface/50 px-4 py-3">
        {order.status === "cancelled" ? (
          <p className="text-[13px] font-medium text-[var(--danger)]">
            This order is cancelled.
          </p>
        ) : (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Progress — tap the next step only
            </p>
            <ol className="mb-3 grid grid-cols-4 gap-1.5">
              {FLOW_STEPS.map((step, index) => {
                const done = stepIndex > index;
                const current = stepIndex === index && order.status !== "shipped";
                const finishedShip =
                  order.status === "shipped" && index === FLOW_STEPS.length - 1;
                return (
                  <li
                    key={step.key}
                    className={cn(
                      "rounded-[6px] px-1.5 py-1.5 text-center text-[11px] font-semibold",
                      done || finishedShip
                        ? "bg-[#dcfce7] text-success"
                        : current
                          ? "bg-[color-mix(in_srgb,var(--theme)_14%,#fff)] text-theme ring-1 ring-theme"
                          : "bg-white text-muted ring-1 ring-border"
                    )}
                  >
                    {done || finishedShip ? (
                      <i className="fa-solid fa-check mr-1" aria-hidden />
                    ) : (
                      <span className="mr-1 opacity-70">{index + 1}.</span>
                    )}
                    {step.label}
                  </li>
                );
              })}
            </ol>

            <div
              className={cn(
                "rounded-[6px] border px-3 py-3",
                paymentStatus === "submitted" &&
                  "border-[#fdba74] bg-[#fff7ed]",
                paymentStatus === "verified" &&
                  order.status !== "shipped" &&
                  "border-border bg-white",
                order.status === "shipped" && "border-[#86efac] bg-[#f0fdf4]",
                waitingForUtr && "border-border bg-white"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {order.utr ? (
                    <p className="font-mono text-[13px] font-semibold tracking-wide">
                      <span className="mr-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                        UTR
                      </span>
                      {order.utr}
                    </p>
                  ) : (
                    <p className="text-[13px] font-medium text-muted">
                      No UTR yet
                    </p>
                  )}
                  <p className="mt-1 text-[12px] text-muted">
                    {order.status === "shipped"
                      ? "Done — order shipped."
                      : action?.hint}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  {order.status === "shipped" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#dcfce7] px-3 py-2 text-[13px] font-semibold text-success">
                      <i className="fa-solid fa-circle-check" aria-hidden />
                      Completed
                    </span>
                  ) : waitingForUtr ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-surface px-3 py-2 text-[13px] font-medium text-muted">
                      <i className="fa-solid fa-hourglass-half" aria-hidden />
                      Waiting for customer UTR
                    </span>
                  ) : action ? (
                    <button
                      type="button"
                      className={cn(
                        "btn min-h-11 w-full px-5 sm:w-auto",
                        action.tone === "success"
                          ? "btn-primary"
                          : "btn-primary"
                      )}
                      disabled={pending}
                      onClick={() => onPatch(order.id, action.body)}
                    >
                      <i className="fa-solid fa-arrow-right" aria-hidden />
                      {action.label}
                    </button>
                  ) : null}

                  {order.status !== "shipped" ? (
                    <button
                      type="button"
                      className="btn btn-ghost h-9 px-2 text-[12px] text-[var(--danger)]"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Cancel order ${order.id}? This cannot be easily undone.`
                          )
                        ) {
                          onPatch(order.id, { status: "cancelled" });
                        }
                      }}
                    >
                      Cancel order
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Items ({order.items.length})
        </p>
        <ul className="space-y-2">
          {order.items.map((item) => {
            const unitCost = Number(item.cost) || 0;
            const lineSell = item.sellPrice * item.qty;
            const lineCost = unitCost * item.qty;
            const lineProfit = orderItemProfit(item);

            return (
              <li
                key={`${order.id}-${item.productId}`}
                className="rounded-[6px] border border-border bg-surface/40 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {item.productName}
                      <span className="ml-1.5 text-muted">× {item.qty}</span>
                    </p>
                  </div>
                  {item.platformUrl ? (
                    <a
                      href={item.platformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-soft h-8 px-2.5 text-[11px]"
                      title="Open source listing to fulfill"
                    >
                      Open source
                      <i
                        className="fa-solid fa-arrow-up-right-from-square text-[10px]"
                        aria-hidden
                      />
                    </a>
                  ) : null}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-[4px] bg-white px-2 py-1.5 ring-1 ring-border">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Sell
                    </p>
                    <p className="text-[13px] font-semibold text-foreground">
                      {formatINRPrecise(item.sellPrice)}
                    </p>
                    <p className="text-[10px] text-muted">
                      ×{item.qty} = {formatINRPrecise(lineSell)}
                    </p>
                  </div>
                  <div className="rounded-[4px] bg-white px-2 py-1.5 ring-1 ring-border">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Cost
                    </p>
                    <p className="text-[13px] font-semibold text-foreground">
                      {formatINRPrecise(unitCost)}
                    </p>
                    <p className="text-[10px] text-muted">
                      ×{item.qty} = {formatINRPrecise(lineCost)}
                    </p>
                  </div>
                  <div className="rounded-[4px] bg-white px-2 py-1.5 ring-1 ring-border">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Line total
                    </p>
                    <p className="text-[13px] font-semibold text-theme">
                      {formatINRPrecise(lineSell)}
                    </p>
                  </div>
                  <div className="rounded-[4px] bg-white px-2 py-1.5 ring-1 ring-border">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Profit
                    </p>
                    <p
                      className={cn(
                        "text-[13px] font-semibold",
                        lineProfit >= 0
                          ? "text-success"
                          : "text-[var(--danger)]"
                      )}
                    >
                      {formatINRPrecise(lineProfit)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {order.notes ? (
          <p className="mt-3 rounded-[6px] border border-dashed border-border px-3 py-2 text-[12px] text-muted">
            <span className="font-semibold text-foreground">Note: </span>
            {order.notes}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function StatusChip({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        status === "new" && "bg-[#eff6ff] text-[#1d4ed8]",
        status === "confirmed" && "bg-[#ecfdf5] text-success",
        status === "fulfilling" && "bg-[#fff7ed] text-[#c2410c]",
        status === "shipped" && "bg-[#f5f3ff] text-[#6d28d9]",
        status === "cancelled" && "bg-[#fef2f2] text-[var(--danger)]"
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function PaymentChip({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "verified" && "bg-[#dcfce7] text-success",
        status === "submitted" && "bg-[#ffedd5] text-[#c2410c]",
        status === "unpaid" && "bg-white text-muted ring-1 ring-border"
      )}
    >
      <i
        className={cn(
          "fa-solid text-[10px]",
          status === "verified" && "fa-circle-check",
          status === "submitted" && "fa-hourglass-half",
          status === "unpaid" && "fa-circle-xmark"
        )}
        aria-hidden
      />
      Payment: {PAYMENT_LABEL[status]}
    </span>
  );
}
