import { NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "fulfilling",
  "shipped",
  "cancelled",
];

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const safeOrder = {
    ...order,
    items: order.items.map(({ platformName, platformUrl, ...item }) => item),
  };
  return NextResponse.json({ order: safeOrder });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as { status?: OrderStatus };
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const order = await updateOrderStatus(id, body.status);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
