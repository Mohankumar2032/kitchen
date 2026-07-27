import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/catalog";
import {
  filterShopProducts,
  paginateProducts,
  parseShopQuery,
  SHOP_PAGE_SIZE,
} from "@/lib/shop-query";


export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = parseShopQuery({
    category: url.searchParams.get("category") || undefined,
    q: url.searchParams.get("q") || undefined,
    page: url.searchParams.get("page") || undefined,
  });
  const pageSize = Math.min(
    48,
    Math.max(
      1,
      Number.parseInt(url.searchParams.get("pageSize") || String(SHOP_PAGE_SIZE), 10) ||
        SHOP_PAGE_SIZE
    )
  );

  const { products, categories } = await getPublicCatalog();
  const filtered = filterShopProducts(products, categories, query);
  const page = paginateProducts(filtered, query.page, pageSize);

  return NextResponse.json({
    products: page.items,
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
    hasMore: page.hasMore,
  });
}
