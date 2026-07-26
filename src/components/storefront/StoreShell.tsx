import { Suspense } from "react";
import { CartProvider } from "./CartProvider";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader, type NavCategory } from "./SiteHeader";
import { listActiveProducts, listCategoryOptions } from "@/lib/store";
import {
  getChildCategories,
  getParentCategories,
  matchingCategorySlugs,
} from "@/lib/types";

async function loadAvailableParents(): Promise<NavCategory[]> {
  const [products, categories] = await Promise.all([
    listActiveProducts(),
    listCategoryOptions(),
  ]);

  return getParentCategories(categories)
    .filter((parent) => parent.slug !== "packs")
    .map((parent) => {
      const match = new Set(matchingCategorySlugs(parent.slug, categories));
      const count = products.filter((p) => match.has(p.category)).length;
      const childSlugs = getChildCategories(parent.slug, categories).map(
        (child) => child.slug
      );
      return {
        slug: parent.slug,
        label: parent.label,
        childSlugs,
        count,
      };
    })
    .filter((parent) => parent.count > 0)
    .map(({ slug, label, childSlugs }) => ({ slug, label, childSlugs }));
}

export async function StoreShell({ children }: { children: React.ReactNode }) {
  const availableParents = await loadAvailableParents();

  return (
    <CartProvider>
      <div className="page-shell flex min-h-screen flex-col">
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader availableParents={availableParents} />
        </Suspense>
        <div className="flex-1">{children}</div>
        <SiteFooter categories={availableParents} />
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
