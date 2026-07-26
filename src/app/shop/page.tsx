import { ShopBrowser } from "@/components/storefront/ShopBrowser";
import { StoreShell } from "@/components/storefront/StoreShell";
import { getCategories, listActiveProducts } from "@/lib/store";
import { toPublicProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const active = await listActiveProducts();
  const products = active.map(toPublicProduct);
  const categories = getCategories(active);

  return (
    <StoreShell>
      <main>
        <div className="container-store py-4 sm:py-6 lg:py-8">
          <ShopBrowser
            products={products}
            categories={categories}
            initialCategory={params.category || "all"}
            initialQuery={params.q || ""}
          />
        </div>
      </main>
    </StoreShell>
  );
}
