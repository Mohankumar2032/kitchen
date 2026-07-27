import Image from "next/image";
import Link from "next/link";
import { priceParts } from "@/lib/pricing";
import type { PublicProduct } from "@/lib/types";
import { categoryLabel } from "@/lib/types";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({
  product,
  priority = false,
}: {
  product: PublicProduct;
  priority?: boolean;
}) {
  const image = product.images[0] || "/products/appliance.svg";
  const pricing = priceParts(product.sellPrice, product.mrp);

  return (
    <article className="product-card group fade-up">
      <Link href={`/product/${product.slug}`} className="product-card__media block">
        <Image
          src={image}
          alt={product.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04] sm:p-5"
          unoptimized={image.endsWith(".svg")}
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {pricing.off ? (
            <span className="badge badge-sale">{pricing.off}% OFF</span>
          ) : null}
          {product.stock > 0 && product.stock <= 12 ? (
            <span className="badge badge-soft">Low stock</span>
          ) : null}
          {product.stock <= 0 ? (
            <span className="badge badge-sale">Sold out</span>
          ) : null}
        </div>
      </Link>

      <div className="product-card__body">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {categoryLabel(product.category)}
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-snug text-foreground hover:text-theme sm:min-h-[36px] sm:text-[14px]"
        >
          {product.name}
        </Link>

        <div className="mt-auto space-y-3 pt-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="price">{pricing.sell}</span>
            {pricing.mrp ? <span className="price-mrp">{pricing.mrp}</span> : null}
            {pricing.off ? (
              <span className="price-off">Save {pricing.off}%</span>
            ) : null}
          </div>
          <AddToCartButton product={product} className="w-full" />
        </div>
      </div>
    </article>
  );
}
