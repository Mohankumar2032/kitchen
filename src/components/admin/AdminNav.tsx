"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Counts = {
  products: number;
  ordersNew: number;
  enquiriesNew: number;
};

const tabs = [
  { href: "/admin/orders", label: "Orders", key: "orders" as const },
  { href: "/admin/commission", label: "% Commission", key: "commission" as const },
  { href: "/admin/products", label: "Products", key: "products" as const },
  { href: "/admin/enquiries", label: "Enquiries", key: "enquiries" as const },
];

export function AdminNav({ counts }: { counts: Counts }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <i className="fa-solid fa-kitchen-set text-theme" aria-hidden />
          Kitchen Admin
        </Link>
        <nav className="flex flex-wrap gap-2">
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
                  "rounded-[6px] px-3 py-2 transition-colors",
                  active
                    ? "bg-theme text-white hover:text-white"
                    : "text-foreground hover:bg-surface"
                )}
              >
                {tab.label}
                {badge !== null ? ` (${badge})` : ""}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
