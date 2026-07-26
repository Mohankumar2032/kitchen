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
          <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme)_22%,transparent),transparent_70%)]" />
          <div className="container-store relative grid items-start gap-4 py-4 sm:gap-5 sm:py-5 md:grid-cols-2 md:items-center md:gap-6 md:py-6">
            <div className="fade-up max-w-xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-theme">
                Kitchen
              </p>
              <h1 className="mt-1.5 text-[26px] font-bold leading-[1.12] tracking-tight sm:text-[32px] md:text-[36px]">
                Everyday kitchen essentials for a better home
              </h1>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
                Storage, cutters, linens, and baking tools — clean pricing and
                delivery across India.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
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
              <p className="mt-2.5 text-[12px] text-muted">
                COD available · Pan-India delivery · Secure checkout
              </p>
            </div>

            <div className="fade-up" style={{ animationDelay: "90ms" }}>
              {heroProduct ? (
                <Link
                  href={`/product/${heroProduct.slug}`}
                  className="group block overflow-hidden rounded-[6px] border border-border bg-[image:var(--grad-media)] shadow-[0_12px_32px_color-mix(in_srgb,var(--theme)_10%,transparent)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[16/11]">
                    <Image
                      src={heroProduct.images[0]}
                      alt={heroProduct.name}
                      fill
                      priority
                      className="object-contain p-2 sm:p-3"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border bg-white/80 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                        Featured
                      </p>
                      <p className="truncate font-semibold group-hover:text-theme">
                        {heroProduct.name}
                      </p>
                    </div>
                    <p className="shrink-0 text-[15px] font-bold text-theme sm:text-[16px]">
                      {formatINR(heroProduct.sellPrice)}
                    </p>
                  </div>
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="container-store py-3 sm:py-4">
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

        <section className="container-store pb-5 sm:pb-6">
          <div className="mb-2.5 flex items-end justify-between gap-3 sm:mb-3">
            <div>
              <h2 className="section-title">Shop by category</h2>
              <p className="section-sub">Find the right tools for your kitchen</p>
            </div>
            <Link href="/shop" className="shrink-0 font-medium text-theme hover:text-theme">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <Link
                  key={cat}
                  href={`/shop?category=${cat}`}
                  className="panel group p-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--hover-border)] hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--theme)_10%,transparent)] sm:p-3"
                >
                  <span className="icon-box mb-1.5 h-8 w-8 transition-all group-hover:bg-[image:var(--grad-theme)] group-hover:text-white sm:h-9 sm:w-9">
                    <i className={`fa-solid ${meta?.icon || "fa-tag"}`} aria-hidden />
                  </span>
                  <p className="font-semibold">{categoryLabel(cat)}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">
                    {meta?.blurb || "Browse products"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="container-store pb-6 sm:pb-8">
          <div className="mb-2.5 flex items-end justify-between gap-3 sm:mb-3">
            <div>
              <h2 className="section-title">Best sellers</h2>
              <p className="section-sub">Popular picks customers are buying</p>
            </div>
            <Link href="/shop" className="btn btn-ghost hidden sm:inline-flex">
              Browse shop
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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
