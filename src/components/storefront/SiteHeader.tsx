"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCart } from "./CartProvider";
import { ThemePicker } from "./ThemePicker";

export interface NavCategory {
  slug: string;
  label: string;
  childSlugs: string[];
}

const NAV_LABELS: Record<string, string> = {
  appliances: "Appliances",
  cookware: "Cookware",
  storage: "Storage",
  "kitchen-tools": "Tools",
  baking: "Baking",
  dining: "Dining",
  cleaning: "Cleaning",
};

export function SiteHeader({
  availableParents = [],
}: {
  availableParents?: NavCategory[];
}) {
  const { count, ready } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");

  const activeCategory = searchParams.get("category") || "";
  const isShop = pathname === "/shop" || pathname.startsWith("/shop");

  const navItems: Array<{
    href: string;
    label: string;
    slug: string | null;
    childSlugs: string[];
  }> = [
    { href: "/shop", label: "Shop", slug: null, childSlugs: [] },
    ...availableParents.map((parent) => ({
      href: `/shop?category=${parent.slug}`,
      label: NAV_LABELS[parent.slug] || parent.label,
      slug: parent.slug,
      childSlugs: parent.childSlugs,
    })),
  ];

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  }

  function isActive(slug: string | null, childSlugs: string[] = []): boolean {
    if (!isShop) return false;
    if (!slug) return !activeCategory;
    if (activeCategory === slug) return true;
    return childSlugs.includes(activeCategory);
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="grad-banner">
        <div className="container-store flex items-center justify-center gap-2 overflow-hidden py-1.5 text-center text-[11px] font-semibold sm:justify-between sm:text-[12px]">
          <span className="truncate">Delivery ₹250 · Free above ₹999</span>
          <span className="hidden truncate sm:inline">
            Special offers live · Limited stock
          </span>
          <span className="hidden truncate md:inline">
            Order early for fast delivery
          </span>
        </div>
      </div>

      <div
        className="border-b border-border backdrop-blur"
        style={{ background: "var(--header-bg)" }}
      >
        <div className="container-store flex items-center gap-3 py-2.5 sm:gap-4 sm:py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="icon-box-solid h-9 w-9">
              <i className="fa-solid fa-kitchen-set" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight">
                Kitchen
              </span>
              <span className="hidden text-[11px] text-muted sm:block">
                Appliances store
              </span>
            </span>
          </Link>

          <form
            onSubmit={onSearch}
            className="input-search-wrap mx-auto hidden max-w-xl flex-1 md:block"
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              className="input-search"
              placeholder="Search mixers, kettles, cookware..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search products"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <ThemePicker />
            <Link
              href="/shop"
              className="btn btn-soft hidden h-10 px-3 lg:inline-flex"
            >
              <i className="fa-solid fa-store" aria-hidden />
              <span className="hidden xl:inline">Browse</span>
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex h-10 items-center gap-2 rounded-[6px] border border-border bg-white/85 px-3 hover:border-[var(--hover-border)] hover:bg-[var(--hover-tint)] hover:text-theme"
            >
              <i className="fa-solid fa-cart-shopping" aria-hidden />
              <span className="hidden sm:inline">Cart</span>
              {ready && count > 0 ? (
                <span className="grad-theme absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <form onSubmit={onSearch} className="container-store pb-2 md:hidden">
          <div className="input-search-wrap">
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              className="input-search"
              placeholder="Search products..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search products"
            />
          </div>
        </form>

        <nav className="container-store relative z-10 chips-scroll gap-1 pb-2.5">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              scroll={false}
              className={cn(
                "nav-chip touch-manipulation",
                isActive(item.slug, item.childSlugs) && "active"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
