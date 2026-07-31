import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/store";
import { toPublicOrder } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "Enter an order ID" },
      { status: 400 }
    );
  }

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: toPublicOrder(order) });
}
