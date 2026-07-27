import { ProductTable } from "@/components/admin/ProductTable";
import {
  getCounts,
  getSettings,
  listCategoryOptions,
  listProducts,
} from "@/lib/store";


export default async function AdminProductsPage() {
  const [products, settings, counts, categories] = await Promise.all([
    listProducts(),
    getSettings(),
    getCounts(),
    listCategoryOptions(),
  ]);

  return (
    <ProductTable
      initialProducts={products}
      initialCategories={categories}
      settings={settings}
      counts={{
        products: counts.products,
        packs: counts.packs,
        onlyProducts: counts.onlyProducts,
      }}
    />
  );
}
