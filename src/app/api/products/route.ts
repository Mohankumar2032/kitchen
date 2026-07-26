import { NextResponse } from "next/server";
import {
  createProduct,
  getCounts,
  listCategoryOptions,
  listProducts,
} from "@/lib/store";
import type { ProductCreateInput } from "@/lib/store";
import { sanitizeImageList } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [products, counts] = await Promise.all([listProducts(), getCounts()]);
  return NextResponse.json({ products, counts });
}

export async function POST(req: Request) {
  let body: Partial<ProductCreateInput>;
  try {
    body = (await req.json()) as Partial<ProductCreateInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const categories = await listCategoryOptions();
  if (!category || !categories.some((option) => option.slug === category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  let images: string[] | undefined;
  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length === 0) {
      images = [];
    } else {
      const sanitized = sanitizeImageList(body.images);
      if (!sanitized) {
        return NextResponse.json(
          { error: "Invalid images list" },
          { status: 400 }
        );
      }
      images = sanitized;
    }
  }

  try {
    const product = await createProduct({
      name,
      category,
      type: body.type,
      status: body.status,
      description: body.description,
      images,
      cost: body.cost,
      sellPrice: body.sellPrice,
      mrp: body.mrp,
      platformPrice: body.platformPrice,
      platformName: body.platformName,
      platformUrl: body.platformUrl,
      stock: body.stock,
      commissionPercent: body.commissionPercent,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product create failed", error);
    const message =
      error instanceof Error ? error.message : "Could not create product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
