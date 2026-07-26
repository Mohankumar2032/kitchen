import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import { StoreShell } from "@/components/storefront/StoreShell";
import { getCategories, listActiveProducts } from "@/lib/store";
import { CATEGORY_META, categoryLabel, toPublicProduct } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const active = await listActiveProducts();
  const products = active.map(toPublicProduct);
  const categories = getCategories(active);
  const featured = products.slice(0, 8);
  const heroProduct = products[0];

  return (
    <StoreShell>
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="grad-hero pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme)_22%,transparent),transparent_70%)]" />
          <div className="container-store relative grid items-center gap-8 py-8 sm:py-12 md:grid-cols-2 md:gap-10 md:py-16">
            <div className="fade-up">
              <span className="badge badge-soft">New season essentials</span>
              <h1 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-tight sm:text-[34px] md:text-[42px]">
                Everyday kitchen essentials for a better home
              </h1>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted sm:text-[14px]">
                Shop storage containers, cutters, linens, and baking tools.
                Clean pricing, fast checkout, delivery across India.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
                <Link href="/shop" className="btn btn-primary px-4 sm:px-5">
                  Shop collection
                  <i className="fa-solid fa-arrow-right" aria-hidden />
                </Link>
                <Link
                  href="/shop?category=plastic-containers"
                  className="btn btn-ghost px-4 sm:px-5"
                >
                  Storage containers
                </Link>
              </div>
              <div className="mt-6 grid max-w-md grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
                {[
                  ["10+", "Products"],
                  ["COD", "Available"],
                  ["Pan-India", "Delivery"],
                ].map(([value, label]) => (
                  <div key={label} className="panel px-2 py-2.5 sm:px-3 sm:py-3">
                    <p className="text-[15px] font-bold text-theme sm:text-[16px]">
                      {value}
                    </p>
                    <p className="text-[11px] text-muted sm:text-[12px]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="fade-up" style={{ animationDelay: "90ms" }}>
              <div className="panel overflow-hidden shadow-[0_20px_50px_color-mix(in_srgb,var(--theme)_12%,transparent)]">
                <div className="grad-media relative aspect-[4/3]">
                  {heroProduct ? (
                    <Image
                      src={heroProduct.images[0]}
                      alt={heroProduct.name}
                      fill
                      priority
                      className="object-contain p-6 sm:p-8"
                      unoptimized
                    />
                  ) : null}
                </div>
                {heroProduct ? (
                  <div className="flex items-center justify-between gap-3 border-t border-border p-3 sm:p-4">
                    <div className="min-w-0">
                      <p className="text-muted">Featured</p>
                      <p className="truncate font-semibold">{heroProduct.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[16px] font-bold text-theme sm:text-[18px]">
                        {formatINR(heroProduct.sellPrice)}
                      </p>
                      <Link
                        href={`/product/${heroProduct.slug}`}
                        className="text-theme hover:text-theme"
                      >
                        View product
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="container-store py-6 sm:py-8">
          <div className="trust-strip">
            {[
              ["fa-truck-fast", "Fast delivery", "Ships across India"],
              ["fa-shield-halved", "Secure checkout", "Safe order flow"],
              ["fa-rotate-left", "Easy returns", "Hassle-free support"],
              ["fa-headset", "Help when needed", "Order assistance"],
            ].map(([icon, title, sub]) => (
              <div key={title} className="trust-item">
                <i className={`fa-solid ${icon}`} aria-hidden />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-muted">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="container-store pb-8 sm:pb-10">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <div>
              <h2 className="section-title">Shop by category</h2>
              <p className="section-sub">Find the right tools for your kitchen</p>
            </div>
            <Link href="/shop" className="shrink-0 font-medium text-theme hover:text-theme">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <Link
                  key={cat}
                  href={`/shop?category=${cat}`}
                  className="panel group p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--hover-border)] hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--theme)_10%,transparent)] sm:p-4"
                >
                  <span className="icon-box mb-2 h-9 w-9 transition-all group-hover:bg-[image:var(--grad-theme)] group-hover:text-white sm:mb-3 sm:h-10 sm:w-10">
                    <i className={`fa-solid ${meta?.icon || "fa-tag"}`} aria-hidden />
                  </span>
                  <p className="font-semibold">{categoryLabel(cat)}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted">
                    {meta?.blurb || "Browse products"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="container-store pb-10 sm:pb-14">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <div>
              <h2 className="section-title">Best sellers</h2>
              <p className="section-sub">Popular picks customers are buying</p>
            </div>
            <Link href="/shop" className="btn btn-ghost hidden sm:inline-flex">
              Browse shop
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </div>
        </section>
      </main>
    </StoreShell>
  );
}
