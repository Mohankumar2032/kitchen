import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { listOrders } from "@/lib/store";


export default async function AdminOrdersPage() {
  const orders = await listOrders();
  return <OrdersPanel initialOrders={orders} />;
}
