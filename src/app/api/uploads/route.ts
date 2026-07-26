import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4.5 * 1024 * 1024;
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
      { error: "Image must be under 4.5 MB" },
      { status: 400 }
    );
  }

  const ext = safeExt(file);
  const id = randomBytes(6).toString("hex");
  const pathname = `products/${Date.now()}-${id}.${ext}`;
  const onVercel = Boolean(process.env.VERCEL);

  try {
    if (canUseBlob()) {
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false,
        ...(process.env.BLOB_READ_WRITE_TOKEN
          ? { token: process.env.BLOB_READ_WRITE_TOKEN }
          : {}),
      });
      return NextResponse.json({ url: blob.url, storage: "blob" as const });
    }

    // Local filesystem only works in local/dev — Vercel is read-only
    if (onVercel) {
      return NextResponse.json(
        {
          error:
            "File upload needs Vercel Blob. For Meesho photos, paste the image URL and click Add URL instead.",
        },
        { status: 503 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const localName = `${Date.now()}-${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadsDir, localName), buffer);
    return NextResponse.json({
      url: `/uploads/${localName}`,
      storage: "local" as const,
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
