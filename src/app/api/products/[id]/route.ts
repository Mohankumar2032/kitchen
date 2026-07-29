import { NextResponse } from "next/server";
import { sanitizeImageList } from "@/lib/images";
import { deleteProduct, getProductById, updateProduct } from "@/lib/store";
import type { ProductUpdate } from "@/lib/types";

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

  if (typeof patch.name === "string") {
    patch.name = patch.name.trim();
    if (!patch.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
  }
  if (typeof patch.description === "string") {
    patch.description = patch.description.trim();
  }
  if (typeof patch.platformName === "string") {
    patch.platformName = patch.platformName.trim() || "Meesho";
  }
  if (typeof patch.platformUrl === "string") {
    patch.platformUrl = patch.platformUrl.trim();
  }
  if (typeof patch.category === "string") {
    patch.category = patch.category.trim();
    if (!patch.category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }
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

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;

  try {
    const deleted = await deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product delete failed", error);
    const message =
      error instanceof Error ? error.message : "Could not delete product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
