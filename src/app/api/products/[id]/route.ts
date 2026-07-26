import { NextResponse } from "next/server";
import { sanitizeImageList } from "@/lib/images";
import { getProductById, updateProduct } from "@/lib/store";
import type { ProductUpdate } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as ProductUpdate;

  const allowed: (keyof ProductUpdate)[] = [
    "name",
    "category",
    "type",
    "status",
    "description",
    "images",
    "cost",
    "sellPrice",
    "platformPrice",
    "platformName",
    "platformUrl",
    "stock",
    "commissionPercent",
  ];

  const patch = {} as ProductUpdate;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      Object.assign(patch, { [key]: body[key] });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "images")) {
    const images = sanitizeImageList(body.images);
    if (!images) {
      return NextResponse.json(
        { error: "Invalid images list" },
        { status: 400 }
      );
    }
    patch.images = images;
  }

  try {
    const product = await updateProduct(id, patch);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product update failed", error);
    const message =
      error instanceof Error ? error.message : "Could not save product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
