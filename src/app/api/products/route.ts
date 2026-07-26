import { NextResponse } from "next/server";
import { createProduct, getCounts, listProducts } from "@/lib/store";
import type { ProductCreateInput } from "@/lib/store";
import { CATEGORY_META } from "@/lib/types";

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
  if (!category || !CATEGORY_META[category]) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const product = await createProduct({
      name,
      category,
      type: body.type,
      status: body.status,
      description: body.description,
      images: body.images,
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
    const message =
      error instanceof Error ? error.message : "Could not create product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
