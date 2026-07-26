import { Suspense } from "react";
import { ShopBrowser } from "@/components/storefront/ShopBrowser";
import { StoreShell } from "@/components/storefront/StoreShell";
import { listActiveProducts, listCategoryOptions } from "@/lib/store";
import { toPublicProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const [active, categories] = await Promise.all([
    listActiveProducts(),
    listCategoryOptions(),
  ]);
  const products = active.map(toPublicProduct);

  return (
    <StoreShell>
      <main>
        <div className="container-store py-4 sm:py-6 lg:py-8">
          <Suspense
            fallback={
              <div className="panel p-8 text-center text-muted">Loading shop…</div>
            }
          >
            <ShopBrowser
              key={`${params.category || "all"}:${params.q || ""}`}
              products={products}
              categories={categories}
              initialCategory={params.category || "all"}
              initialQuery={params.q || ""}
            />
          </Suspense>
        </div>
      </main>
    </StoreShell>
  );
}
