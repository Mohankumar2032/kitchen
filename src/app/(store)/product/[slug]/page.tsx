import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { priceParts } from "@/lib/pricing";
import { getCachedProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { categoryLabel, toPublicProduct } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const publicProduct = toPublicProduct(product);
  const related = await getRelatedProducts(product.id, product.category, 4);

  const inStock = product.stock > 0;
  const pricing = priceParts(product.sellPrice, product.mrp);

  return (
    <main>
      <div className="container-store py-4 sm:py-6 lg:py-8">
        <nav className="text-muted">
          <Link href="/" className="hover:text-theme">
            Home
          </Link>
          <span className="mx-1.5 text-border-strong">/</span>
          <Link href="/shop" className="hover:text-theme">
            Shop
          </Link>
          <span className="mx-1.5 text-border-strong">/</span>
          <Link
            href={`/shop?category=${product.category}`}
            className="hover:text-theme"
          >
            {categoryLabel(product.category)}
          </Link>
        </nav>

        <div className="panel mt-4 grid gap-6 p-3 sm:mt-5 sm:gap-8 sm:p-4 md:grid-cols-2 md:p-6">
          <ProductGallery images={product.images} name={product.name} />

          <div className="fade-up space-y-5" style={{ animationDelay: "60ms" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {categoryLabel(product.category)}
              </p>
              <h1 className="mt-2 text-[22px] font-bold leading-tight tracking-tight sm:text-[28px] md:text-[32px]">
                {product.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-[28px] font-bold tracking-tight">
                {pricing.sell}
              </span>
              {pricing.mrp ? (
                <span className="price-mrp text-[14px]">{pricing.mrp}</span>
              ) : null}
              {pricing.off ? (
                <span className="badge badge-sale">{pricing.off}% OFF</span>
              ) : null}
            </div>

            <p className="max-w-xl text-[14px] leading-relaxed text-muted">
              {product.description}
            </p>

            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="rounded-[6px] border border-border bg-surface px-3 py-2">
                <i
                  className={`fa-solid ${inStock ? "fa-circle-check text-success" : "fa-circle-xmark text-danger"} mr-2`}
                  aria-hidden
                />
                {inStock ? `In stock · ${product.stock} left` : "Out of stock"}
              </li>
              <li className="rounded-[6px] border border-border bg-surface px-3 py-2">
                <i className="fa-solid fa-truck-fast mr-2 text-theme" aria-hidden />
                Delivery across India
              </li>
              <li className="rounded-[6px] border border-border bg-surface px-3 py-2">
                <i className="fa-solid fa-shield-halved mr-2 text-theme" aria-hidden />
                Secure checkout
              </li>
              <li className="rounded-[6px] border border-border bg-surface px-3 py-2">
                <i className="fa-solid fa-rotate-left mr-2 text-theme" aria-hidden />
                Easy returns
              </li>
            </ul>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <AddToCartButton
                product={publicProduct}
                className="w-full sm:min-w-[180px] sm:w-auto"
              />
              <Link
                href="/cart"
                className={`btn btn-ghost w-full sm:w-auto ${inStock ? "" : "pointer-events-none opacity-55"}`}
              >
                Go to cart
              </Link>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-10">
            <h2 className="section-title mb-4">You may also like</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
