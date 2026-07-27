import { NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/store";
import type { CheckoutPayload } from "@/lib/types";


export async function GET() {
  const orders = await listOrders();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutPayload;

    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }
    if (
      !body.addressLine1?.trim() ||
      !body.city?.trim() ||
      !body.state?.trim() ||
      !body.pincode?.trim()
    ) {
      return NextResponse.json(
        { error: "Complete shipping address is required" },
        { status: 400 }
      );
    }

    const order = await createOrder(body);

    // Customer response: strip source platform fields
    const safeOrder = {
      ...order,
      items: order.items.map(({ platformName, platformUrl, ...item }) => item),
    };

    return NextResponse.json({ order: safeOrder }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
