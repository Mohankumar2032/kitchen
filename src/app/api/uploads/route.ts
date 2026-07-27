import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  buildImageVariantBuffers,
  composeVariants,
  toTransferableBuffer,
  toTransferableBytes,
} from "@/lib/image-variants";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function safeExt(file: File): string {
  const fromType = EXT_BY_TYPE[file.type];
  if (fromType) return fromType;
  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "bin";
}

function canUseBlob(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL_OIDC_TOKEN
  );
}

async function storeBuffer(
  pathname: string,
  buffer: Uint8Array | Buffer,
  contentType: string
): Promise<string> {
  // Plain Uint8Array / Blob — never pass a Node Buffer that may wrap SharedArrayBuffer.
  const bytes = toTransferableBytes(buffer);

  if (canUseBlob()) {
    const blob = await put(pathname, new Blob([bytes], { type: contentType }), {
      access: "public",
      addRandomSuffix: false,
      contentType,
      ...(process.env.BLOB_READ_WRITE_TOKEN
        ? { token: process.env.BLOB_READ_WRITE_TOKEN }
        : {}),
    });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const localName = path.basename(pathname);
  await fs.writeFile(path.join(uploadsDir, localName), Buffer.from(bytes));
  return `/uploads/${localName}`;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, GIF, or SVG images are allowed" },
      { status: 400 }
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 8 MB" },
      { status: 400 }
    );
  }

  const id = randomBytes(6).toString("hex");
  const stamp = Date.now();
  const onVercel = Boolean(process.env.VERCEL);

  try {
    // SVGs stay as-is (no Sharp rasterization)
    if (file.type === "image/svg+xml") {
      const ext = safeExt(file);
      const pathname = `products/${stamp}-${id}.${ext}`;
      const buffer = toTransferableBuffer(
        new Uint8Array(await file.arrayBuffer())
      );

      if (!canUseBlob() && onVercel) {
        return NextResponse.json(
          {
            error:
              "File upload needs Vercel Blob. For Meesho photos, paste the image URL and click Add URL instead.",
          },
          { status: 503 }
        );
      }

      const url = await storeBuffer(pathname, buffer, file.type);
      return NextResponse.json({
        url,
        variants: {
          thumb: url,
          card: url,
          gallery: url,
          original: url,
        },
        storage: canUseBlob() ? ("blob" as const) : ("local" as const),
      });
    }

    if (!canUseBlob() && onVercel) {
      return NextResponse.json(
        {
          error:
            "File upload needs Vercel Blob. For Meesho photos, paste the image URL and click Add URL instead.",
        },
        { status: 503 }
      );
    }

    const input = toTransferableBuffer(
      new Uint8Array(await file.arrayBuffer())
    );

    let buffers: Awaited<ReturnType<typeof buildImageVariantBuffers>>;
    try {
      buffers = await buildImageVariantBuffers(input);
    } catch (sharpError) {
      console.error("Sharp variant build failed; storing original", sharpError);
      // Fallback: store the uploaded bytes once so admin product create isn't blocked.
      const ext = safeExt(file);
      const pathname = `products/${stamp}-${id}.${ext}`;
      const url = await storeBuffer(pathname, input, file.type);
      return NextResponse.json({
        url,
        variants: {
          thumb: url,
          card: url,
          gallery: url,
          original: url,
        },
        storage: canUseBlob() ? ("blob" as const) : ("local" as const),
      });
    }

    const base = `products/${stamp}-${id}`;

    const [thumb, card, gallery, original] = await Promise.all([
      storeBuffer(`${base}-thumb.webp`, buffers.thumb, "image/webp"),
      storeBuffer(`${base}-card.webp`, buffers.card, "image/webp"),
      storeBuffer(`${base}-gallery.webp`, buffers.gallery, "image/webp"),
      storeBuffer(`${base}-original.webp`, buffers.original, "image/webp"),
    ]);

    const composed = composeVariants({
      thumb,
      card,
      gallery,
      original,
      blurDataURL: buffers.blurDataURL,
    });

    return NextResponse.json({
      url: composed.displayUrl,
      variants: composed.variants,
      storage: canUseBlob() ? ("blob" as const) : ("local" as const),
    });
  } catch (error) {
    console.error("Upload failed", error);
    const detail =
      error instanceof Error && error.message
        ? error.message
        : "Upload failed";
    return NextResponse.json(
      {
        error: onVercel
          ? `${detail}. Tip: paste a Meesho/CDN image URL and click Add URL.`
          : detail,
      },
      { status: 500 }
    );
  }
}
