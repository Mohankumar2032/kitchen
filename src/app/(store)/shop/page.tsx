import { Suspense } from "react";
import { ShopBrowser } from "@/components/storefront/ShopBrowser";
import { getPublicCatalog } from "@/lib/catalog";
import {
  filterShopProducts,
  paginateProducts,
  parseShopQuery,
  SHOP_PAGE_SIZE,
} from "@/lib/shop-query";

type Props = {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
};

async function ShopPageContent({ searchParams }: Props) {
  const params = await searchParams;
  const query = parseShopQuery(params);
  const { products, categories, categoryCounts, totalActive } =
    await getPublicCatalog();

  const filtered = filterShopProducts(products, categories, query);
  const page = paginateProducts(filtered, 1, SHOP_PAGE_SIZE);

  return (
    <ShopBrowser
      key={`${query.category}:${query.q}`}
      initialProducts={page.items}
      totalFiltered={page.total}
      totalActive={totalActive}
      categories={categories}
      categoryCounts={categoryCounts}
      initialCategory={query.category}
      initialQuery={query.q}
      pageSize={SHOP_PAGE_SIZE}
    />
  );
}

export default function ShopPage({ searchParams }: Props) {
  return (
    <main>
      <div className="container-store py-4 sm:py-6 lg:py-8">
        <Suspense
          fallback={
            <div className="panel p-8 text-center text-muted">Loading shop…</div>
          }
        >
          <ShopPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
