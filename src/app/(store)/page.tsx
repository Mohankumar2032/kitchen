import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getPublicCatalog } from "@/lib/catalog";
import { categoryLabel, getParentCategories } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { isUnoptimizedImage } from "@/lib/images";

export default async function HomePage() {
  const { products } = await getPublicCatalog();
  const categories = getParentCategories().filter((c) => c.slug !== "packs");
  const featured = products.slice(0, 8);
  const heroProducts = products.slice(0, 3);
  const heroProduct = heroProducts[0];

  return (
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
              Appliances, cookware, storage, and tools — clean pricing and
              delivery across India.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
              <Link href="/shop" className="btn btn-primary px-4 sm:px-5">
                Shop collection
                <i className="fa-solid fa-arrow-right" aria-hidden />
              </Link>
              <Link
                href="/shop?category=storage"
                className="btn btn-ghost px-4 sm:px-5"
              >
                Storage
              </Link>
            </div>
            <p className="mt-2.5 text-[12px] text-muted">
              COD available · Pan-India delivery · Secure checkout
            </p>
          </div>

          <div className="fade-up" style={{ animationDelay: "90ms" }}>
            {heroProduct ? (
              <div className="relative min-h-[290px] overflow-hidden rounded-[8px] border border-border bg-[linear-gradient(135deg,#fff8ed_0%,#fff_48%,#fff1df_100%)] p-3 shadow-[0_14px_36px_color-mix(in_srgb,var(--theme)_12%,transparent)] sm:min-h-[320px] sm:p-4">
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-200/35 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-yellow-200/30 blur-2xl" />

                <div className="relative mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-theme">
                      Popular right now
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold">
                      Kitchen picks you&apos;ll love
                    </p>
                  </div>
                  <span className="rounded-full border border-orange-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-orange-700">
                    New collection
                  </span>
                </div>

                <div className="relative grid grid-cols-[minmax(0,1.45fr)_minmax(110px,0.75fr)] gap-2.5">
                  <Link
                    href={`/product/${heroProduct.slug}`}
                    className="group overflow-hidden rounded-[7px] border border-white/90 bg-white shadow-sm transition-transform motion-safe:hover:-translate-y-0.5"
                  >
                    <div className="relative h-[164px] sm:h-[190px]">
                      <Image
                        src={heroProduct.images[0]}
                        alt={heroProduct.name}
                        fill
                        priority
                        sizes="(max-width: 768px) 70vw, 420px"
                        className="object-contain p-3"
                        unoptimized={isUnoptimizedImage(heroProduct.images[0])}
                      />
                    </div>
                    <div className="border-t border-border px-3 py-2">
                      <p className="line-clamp-1 text-[12px] font-semibold group-hover:text-theme">
                        {heroProduct.name}
                      </p>
                      <p className="mt-0.5 font-bold text-theme">
                        {formatINR(heroProduct.sellPrice)}
                      </p>
                    </div>
                  </Link>

                  <div className="grid grid-rows-2 gap-2.5">
                    {heroProducts.slice(1).map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="group flex min-h-0 flex-col overflow-hidden rounded-[7px] border border-white/90 bg-white shadow-sm transition-transform motion-safe:hover:-translate-y-0.5"
                      >
                        <div className="relative min-h-0 flex-1">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            sizes="140px"
                            className="object-contain p-2"
                            unoptimized={isUnoptimizedImage(product.images[0])}
                          />
                        </div>
                        <div className="border-t border-border px-2 py-1.5">
                          <p className="line-clamp-1 text-[10px] font-semibold group-hover:text-theme">
                            {product.name}
                          </p>
                          <p className="text-[11px] font-bold text-theme">
                            {formatINR(product.sellPrice)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
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
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {categories.map((cat) => {
            return (
              <Link
                key={cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="panel group p-2.5 transition-all motion-safe:hover:-translate-y-0.5 hover:border-[var(--hover-border)] hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--theme)_10%,transparent)] sm:p-3"
              >
                <span className="icon-box mb-1.5 h-8 w-8 transition-all group-hover:bg-[image:var(--grad-theme)] group-hover:text-white sm:h-9 sm:w-9">
                  <i className={`fa-solid ${cat.icon || "fa-tag"}`} aria-hidden />
                </span>
                <p className="font-semibold">{categoryLabel(cat.slug)}</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">
                  {cat.blurb || "Browse products"}
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
  );
}
