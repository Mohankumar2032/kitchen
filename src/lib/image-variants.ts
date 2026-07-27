import sharp from "sharp";
import type { ImageVariants } from "@/lib/types";

export interface GeneratedVariants {
  variants: ImageVariants;
  /** Preferred storefront URL (card WebP). */
  displayUrl: string;
}

const VARIANT_SPECS = [
  { key: "thumb" as const, width: 256 },
  { key: "card" as const, width: 640 },
  { key: "gallery" as const, width: 1400 },
];

function tinyBlurDataUrl(buffer: Buffer): string {
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

/**
 * Generate WebP thumb/card/gallery variants from an uploaded image buffer.
 * Caller is responsible for uploading each buffer and composing final URLs.
 */
export async function buildImageVariantBuffers(
  input: Buffer
): Promise<{
  thumb: Buffer;
  card: Buffer;
  gallery: Buffer;
  original: Buffer;
  blurDataURL: string;
}> {
  const image = sharp(input, { failOn: "none" }).rotate();
  const meta = await image.metadata();

  const original = await image
    .clone()
    .resize({
      width: Math.min(meta.width || 2000, 2000),
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const [thumb, card, gallery, blur] = await Promise.all([
    image
      .clone()
      .resize({ width: VARIANT_SPECS[0].width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer(),
    image
      .clone()
      .resize({ width: VARIANT_SPECS[1].width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer(),
    image
      .clone()
      .resize({ width: VARIANT_SPECS[2].width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    image
      .clone()
      .resize({ width: 16, withoutEnlargement: true })
      .webp({ quality: 40 })
      .toBuffer(),
  ]);

  return {
    thumb,
    card,
    gallery,
    original,
    blurDataURL: tinyBlurDataUrl(blur),
  };
}

export function composeVariants(
  urls: Omit<ImageVariants, "blurDataURL"> & { blurDataURL?: string }
): GeneratedVariants {
  return {
    displayUrl: urls.card,
    variants: {
      thumb: urls.thumb,
      card: urls.card,
      gallery: urls.gallery,
      original: urls.original,
      blurDataURL: urls.blurDataURL,
    },
  };
}
