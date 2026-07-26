import { NextResponse } from "next/server";
import { getCounts, listProducts } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [products, counts] = await Promise.all([listProducts(), getCounts()]);
  return NextResponse.json({ products, counts });
}
