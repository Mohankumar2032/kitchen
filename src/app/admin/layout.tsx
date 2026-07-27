import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCounts } from "@/lib/store";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const counts = await getCounts();

  return (
    <div className="page-shell min-h-screen">
      <AdminNav
        counts={{
          products: counts.products,
          ordersNew: counts.ordersNew,
          enquiriesNew: counts.enquiriesNew,
        }}
      />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Suspense fallback={<div className="text-muted">Loading…</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex min-h-screen items-center justify-center text-muted">
          Loading admin…
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
