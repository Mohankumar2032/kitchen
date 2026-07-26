import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { listProducts } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listProducts();
  const product = products.find((p) => p.status === "active") ?? products[0];

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Kitchen</h1>
          <p className="mt-2 text-muted">No products yet. Add one in Admin.</p>
          <Link href="/admin/products" className="btn btn-primary mt-6 inline-flex">
            Open Admin
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="fade-up grid items-center gap-8 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-[6px] bg-surface">
            <Image
              src={product.images[0] || "/products/appliance-1.svg"}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
              unoptimized={product.images[0]?.endsWith(".svg")}
            />
          </div>
          <div className="fade-up" style={{ animationDelay: "80ms" }}>
            <p className="text-muted uppercase tracking-wide">
              {product.category.replace(/-/g, " ")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-snug md:text-3xl">
              {product.name}
            </h1>
            <p className="mt-3 max-w-md text-muted">{product.description}</p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="text-2xl font-semibold text-theme">
                {product.sellPrice > 0 ? formatINR(product.sellPrice) : "Price on request"}
              </div>
              {product.platformPrice > 0 ? (
                <div className="text-muted line-through">
                  {formatINR(product.platformPrice)} on {product.platformName}
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`/product/${product.slug}`}
                className="btn btn-primary"
              >
                View product
              </Link>
              <a
                href={product.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                See on {product.platformName}
                <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
