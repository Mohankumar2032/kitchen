import { Suspense } from "react";
import { StoreShell } from "@/components/storefront/StoreShell";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex min-h-screen items-center justify-center text-muted">
          Loading store…
        </div>
      }
    >
      <StoreShell>
        <Suspense
          fallback={
            <div className="container-store py-8 text-muted">Loading…</div>
          }
        >
          {children}
        </Suspense>
      </StoreShell>
    </Suspense>
  );
}
