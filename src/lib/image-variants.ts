import sharp from "sharp";
import type { Sharp } from "sharp";
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

/**
 * Sharp/native Buffers may be SharedArrayBuffer-backed; undici and
 * @vercel/blob reject those. Always allocate a fresh non-shared ArrayBuffer.
 */
export function toTransferableBytes(
  data: Uint8Array | Buffer
): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(data.byteLength));
  copy.set(data);
  return copy;
}

/** Same as toTransferableBytes, returned as a Node Buffer for local fs writes. */
export function toTransferableBuffer(data: Uint8Array | Buffer): Buffer {
  return Buffer.from(toTransferableBytes(data));
}

function tinyBlurDataUrl(buffer: Buffer): string {
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function toWebpBuffer(
  pipeline: Sharp,
  quality: number
): Promise<Buffer> {
  const { data } = await pipeline.webp({ quality }).toUint8Array();
  return toTransferableBuffer(data);
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
  const image = sharp(toTransferableBuffer(input), { failOn: "none" }).rotate();
  const meta = await image.metadata();

  const original = await toWebpBuffer(
    image.clone().resize({
      width: Math.min(meta.width || 2000, 2000),
      withoutEnlargement: true,
    }),
    82
  );

  const [thumb, card, gallery, blur] = await Promise.all([
    toWebpBuffer(
      image
        .clone()
        .resize({ width: VARIANT_SPECS[0].width, withoutEnlargement: true }),
      72
    ),
    toWebpBuffer(
      image
        .clone()
        .resize({ width: VARIANT_SPECS[1].width, withoutEnlargement: true }),
      78
    ),
    toWebpBuffer(
      image
        .clone()
        .resize({ width: VARIANT_SPECS[2].width, withoutEnlargement: true }),
      80
    ),
    toWebpBuffer(
      image.clone().resize({ width: 16, withoutEnlargement: true }),
      40
    ),
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
