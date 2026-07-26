"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemePicker } from "@/components/storefront/ThemePicker";
import { cn } from "@/lib/utils";

type Counts = {
  products: number;
  ordersNew: number;
  enquiriesNew: number;
};

const tabs = [
  { href: "/admin/orders", label: "Orders", short: "Orders", key: "orders" as const },
  {
    href: "/admin/commission",
    label: "% Commission",
    short: "% Comm",
    key: "commission" as const,
  },
  {
    href: "/admin/products",
    label: "Products",
    short: "Products",
    key: "products" as const,
  },
  {
    href: "/admin/enquiries",
    label: "Enquiries",
    short: "Inbox",
    key: "enquiries" as const,
  },
];

export function AdminNav({ counts }: { counts: Counts }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2 font-semibold text-foreground"
        >
          <i className="fa-solid fa-kitchen-set text-theme" aria-hidden />
          <span className="truncate text-[13px] sm:text-[14px]">
            Kitchen <span className="text-muted">Admin</span>
          </span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemePicker />
          <Link
            href="/shop"
            className="btn btn-ghost hidden h-9 px-2.5 sm:inline-flex"
            title="Open storefront"
          >
            <i className="fa-solid fa-store" aria-hidden />
            <span className="hidden lg:inline">Store</span>
          </Link>
        </div>
      </div>

      <nav className="border-t border-border">
        <div className="chips-scroll mx-auto max-w-7xl gap-1.5 px-3 py-2 sm:gap-2 sm:px-4">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const badge =
              tab.key === "orders"
                ? counts.ordersNew
                : tab.key === "products"
                  ? counts.products
                  : tab.key === "enquiries"
                    ? counts.enquiriesNew
                    : null;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "admin-tab inline-flex shrink-0 items-center gap-1.5 rounded-[6px] px-3 py-2 text-[12px] font-medium transition-colors sm:text-[13px]",
                  active
                    ? "is-active bg-theme text-white"
                    : "text-foreground hover:bg-surface"
                )}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {badge !== null ? (
                  <span
                    className={cn(
                      "rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-surface text-muted"
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
