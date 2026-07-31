import Link from "next/link";

interface FooterCategory {
  slug: string;
  label: string;
}

export function SiteFooter({
  categories = [],
}: {
  categories?: FooterCategory[];
}) {
  return (
    <footer
      className="mt-auto border-t border-border"
      style={{ background: "var(--footer-bg)" }}
    >
      <div className="container-store py-6 sm:py-8">
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-[1.35fr_0.8fr_1fr_1.25fr] lg:gap-8">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="icon-box-solid h-9 w-9">
                <i className="fa-solid fa-kitchen-set" aria-hidden />
              </span>
              <span>
                <span className="block text-[15px] font-bold">Kitchen</span>
                <span className="block text-[10px] text-muted">
                  Essentials for every home
                </span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted sm:text-[13px]">
              Quality kitchen essentials with clear pricing, secure checkout,
              and delivery across India.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
                Shop
              </p>
              <ul className="space-y-2 text-[12px] text-muted sm:text-[13px]">
                <li>
                  <Link href="/shop" className="hover:text-theme">
                    All products
                  </Link>
                </li>
                {categories.slice(0, 4).map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/shop?category=${category.slug}`}
                      className="hover:text-theme"
                    >
                      {category.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
              Help
            </p>
            <ul className="space-y-2 text-[12px] text-muted sm:text-[13px]">
              <li className="flex items-start gap-2">
                <i
                  className="fa-solid fa-truck-fast mt-0.5 w-3 text-theme"
                  aria-hidden
                />
                Pan-India delivery
              </li>
              <li className="flex items-start gap-2">
                <i
                  className="fa-solid fa-money-bill-wave mt-0.5 w-3 text-theme"
                  aria-hidden
                />
                UPI payment · Track by order ID
              </li>
              <li className="flex items-start gap-2">
                <i
                  className="fa-solid fa-envelope mt-0.5 w-3 text-theme"
                  aria-hidden
                />
                <a
                  href="mailto:orders@kitchen.store"
                  className="break-all hover:text-theme"
                >
                  orders@kitchen.store
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
              Shop with confidence
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["fa-shield-halved", "Secure"],
                ["fa-rotate-left", "Easy returns"],
                ["fa-headset", "Support"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="rounded-[6px] border border-border bg-white/70 px-1.5 py-2.5 text-center"
                >
                  <i
                    className={`fa-solid ${icon} block text-[14px] text-theme`}
                    aria-hidden
                  />
                  <span className="mt-1 block text-[10px] font-medium sm:text-[11px]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-store flex flex-col gap-1.5 py-3 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between sm:text-[11px]">
          <p>© 2026 Kitchen. All rights reserved.</p>
          <p>Clear pricing · Secure checkout · Friendly support</p>
        </div>
      </div>
    </footer>
  );
}
