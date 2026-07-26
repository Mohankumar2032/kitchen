import { NextResponse } from "next/server";
import { ensureCategory, listCategoryOptions } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await listCategoryOptions();
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  let body: { label?: string; slug?: string; parent?: string | null };
  try {
    body = (await req.json()) as {
      label?: string;
      slug?: string;
      parent?: string | null;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json(
      { error: "Category name is required" },
      { status: 400 }
    );
  }
  if (label.length > 60) {
    return NextResponse.json(
      { error: "Category name must be 60 characters or fewer" },
      { status: 400 }
    );
  }

  const parent =
    typeof body.parent === "string" && body.parent.trim()
      ? body.parent.trim()
      : null;

  try {
    const category = await ensureCategory(body.slug || label, label, parent);
    const categories = await listCategoryOptions();
    return NextResponse.json({ category, categories }, { status: 201 });
  } catch (error) {
    console.error("Category create failed", error);
    const message =
      error instanceof Error ? error.message : "Could not create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
