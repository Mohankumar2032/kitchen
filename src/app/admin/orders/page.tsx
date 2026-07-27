import { connection } from "next/server";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { listOrders } from "@/lib/store";

export default async function AdminOrdersPage() {
  await connection();
  const orders = await listOrders();
  return <OrdersPanel initialOrders={orders} />;
}
