/** Build storefront shop URLs. Prefer App Router navigation over history hacks. */

export interface ShopFilterDetail {
  category?: string;
  query?: string;
  page?: number;
}

export function buildShopHref(detail: ShopFilterDetail): string {
  const params = new URLSearchParams();

  if (detail.category !== undefined) {
    if (detail.category && detail.category !== "all") {
      params.set("category", detail.category);
    }
  }

  if (detail.query) params.set("q", detail.query);
  if (detail.page && detail.page > 1) params.set("page", String(detail.page));

  const queryString = params.toString();
  return queryString ? `/shop?${queryString}` : "/shop";
}
