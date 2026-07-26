import { ProductTable } from "@/components/admin/ProductTable";
import { getCounts, getSettings, listProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, settings, counts] = await Promise.all([
    listProducts(),
    getSettings(),
    getCounts(),
  ]);

  return (
    <ProductTable
      initialProducts={products}
      settings={settings}
      counts={{
        products: counts.products,
        packs: counts.packs,
        onlyProducts: counts.onlyProducts,
      }}
    />
  );
}
