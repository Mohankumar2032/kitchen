import { Suspense } from "react";
import { CartProvider } from "./CartProvider";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { getNavCategories } from "@/lib/catalog";

export async function StoreShell({ children }: { children: React.ReactNode }) {
  const availableParents = await getNavCategories();
  const footerCategories = availableParents.map(
    ({ slug, label, childSlugs }) => ({ slug, label, childSlugs })
  );

  return (
    <CartProvider>
      <div className="page-shell flex min-h-screen flex-col">
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader availableParents={availableParents} />
        </Suspense>
        <div className="flex-1">{children}</div>
        <SiteFooter categories={footerCategories} />
      </div>
    </CartProvider>
  );
}

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="container-store h-14" />
    </header>
  );
}
