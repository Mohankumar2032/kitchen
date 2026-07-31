import { connection } from "next/server";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { listOrders, listProducts } from "@/lib/store";
import { enrichOrderItemCosts } from "@/lib/types";

export default async function AdminOrdersPage() {
  await connection();
  const [orders, products] = await Promise.all([listOrders(), listProducts()]);
  const costByProductId = new Map(
    products.map((p) => [p.id, Number(p.cost) || 0])
  );

  return (
    <OrdersPanel
      initialOrders={enrichOrderItemCosts(orders, costByProductId)}
    />
  );
}
