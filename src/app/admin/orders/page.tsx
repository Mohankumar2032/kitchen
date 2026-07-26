import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { listOrders } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders();
  return <OrdersPanel initialOrders={orders} />;
}
