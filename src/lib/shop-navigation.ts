export const SHOP_FILTER_EVENT = "shop-filter-change";

export interface ShopFilterDetail {
  category?: string;
  query?: string;
}

export function updateShopUrl(detail: ShopFilterDetail): void {
  const params = new URLSearchParams(window.location.search);

  if (detail.category !== undefined) {
    if (detail.category === "all") params.delete("category");
    else params.set("category", detail.category);
  }

  if (detail.query !== undefined) {
    if (detail.query) params.set("q", detail.query);
    else params.delete("q");
  }

  const queryString = params.toString();
  window.history.replaceState(
    null,
    "",
    queryString ? `/shop?${queryString}` : "/shop"
  );
}

export function announceShopFilter(detail: ShopFilterDetail): void {
  window.dispatchEvent(
    new CustomEvent<ShopFilterDetail>(SHOP_FILTER_EVENT, { detail })
  );
}
