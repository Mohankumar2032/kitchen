import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { getProductBySlug, getSettings, listProducts } from "@/lib/store";
import { effectiveCommission } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const products = await listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
  ]);

  if (!product) notFound();

  const commission = effectiveCommission(product, settings);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/" className="text-muted hover:text-theme">
          <i className="fa-solid fa-arrow-left mr-1" aria-hidden />
          Back
        </Link>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <ProductGallery images={product.images} name={product.name} />

          <div className="fade-up space-y-4" style={{ animationDelay: "60ms" }}>
            <div>
              <p className="text-muted capitalize">
                {product.category.replace(/-/g, " ")} · {product.type}
              </p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
                {product.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="text-3xl font-semibold text-theme">
                {product.sellPrice > 0
                  ? formatINR(product.sellPrice)
                  : "Price on request"}
              </div>
              {product.platformPrice > 0 ? (
                <div>
                  <span className="text-muted line-through">
                    {formatINR(product.platformPrice)}
                  </span>
                  <span className="ml-2 text-muted">
                    {product.platformName} price
                  </span>
                </div>
              ) : null}
            </div>

            <p className="text-foreground/90">{product.description}</p>

            <ul className="space-y-2 text-muted">
              <li>
                <i className="fa-solid fa-box mr-2 text-theme" aria-hidden />
                Stock: {product.stock}
              </li>
              <li>
                <i className="fa-solid fa-percent mr-2 text-theme" aria-hidden />
                Commission reference: {commission}%
              </li>
              <li>
                <i
                  className="fa-solid fa-link mr-2 text-theme"
                  aria-hidden
                />
                Source:{" "}
                <a
                  href={product.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-theme"
                >
                  {product.platformName} listing
                </a>
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="btn btn-primary" disabled>
                Buy now (checkout soon)
              </button>
              <a
                href={product.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Compare on {product.platformName}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
