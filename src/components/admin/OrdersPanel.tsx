"use client";

import { useState, useTransition } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { formatINRPrecise } from "@/lib/utils";

const STATUS_OPTIONS: OrderStatus[] = [
  "new",
  "confirmed",
  "fulfilling",
  "shipped",
  "cancelled",
];

export function OrdersPanel({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateStatus(id: string, status: OrderStatus) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setMessage("Could not update status");
        return;
      }
      const data = (await res.json()) as { order: Order };
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? data.order : o))
      );
      setMessage("Order updated");
    });
  }

  if (orders.length === 0) {
    return (
      <div className="fade-up space-y-4">
        <Header />
        <div className="rounded-[6px] border border-dashed border-border p-8 text-center text-muted">
          <i className="fa-solid fa-bag-shopping mb-2 text-2xl text-theme" aria-hidden />
          <div>No customer orders yet. Place a test order from the shop.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up space-y-4">
      <Header />
      {message ? (
        <p className="text-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-[6px] border border-border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{order.id}</p>
                <p className="text-muted">
                  {new Date(order.createdAt).toLocaleString("en-IN")} ·{" "}
                  {order.customerName} · {order.customerPhone}
                </p>
                <p className="text-muted">
                  {order.addressLine1}
                  {order.addressLine2 ? `, ${order.addressLine2}` : ""},{" "}
                  {order.city}, {order.state} — {order.pincode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-theme">
                  {formatINRPrecise(order.subtotal)}
                </span>
                <select
                  className="input w-auto"
                  value={order.status}
                  disabled={pending}
                  onChange={(e) =>
                    updateStatus(order.id, e.target.value as OrderStatus)
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ul className="mt-3 space-y-2 border-t border-border pt-3">
              {order.items.map((item) => (
                <li
                  key={`${order.id}-${item.productId}`}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    {item.productName} × {item.qty}
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="text-muted">
                      {formatINRPrecise(item.sellPrice * item.qty)}
                    </span>
                    {item.platformUrl ? (
                      <a
                        href={item.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme hover:text-theme"
                        title="Open source listing to fulfill"
                      >
                        Fulfill via {item.platformName || "source"}
                        <i
                          className="fa-solid fa-arrow-up-right-from-square ml-1 text-[11px]"
                          aria-hidden
                        />
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Orders</h1>
      <p className="mt-1 text-muted">
        Customer orders from the store. Fulfill manually from Meesho / source
        using the links below — customers never see the source.
      </p>
    </div>
  );
}
