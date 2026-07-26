import { AdminNav } from "@/components/admin/AdminNav";
import { getCounts } from "@/lib/store";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await getCounts();

  return (
    <div className="min-h-screen bg-white">
      <AdminNav
        counts={{
          products: counts.products,
          ordersNew: counts.ordersNew,
          enquiriesNew: counts.enquiriesNew,
        }}
      />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
