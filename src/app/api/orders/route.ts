import { NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/store";
import type { CheckoutPayload } from "@/lib/types";
import { isValidUtr, toPublicOrder } from "@/lib/types";

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
    if (!isValidUtr(body.utr || "")) {
      return NextResponse.json(
        {
          error:
            "Pay via UPI and enter UTR (8–22 letters/numbers) before placing the order",
        },
        { status: 400 }
      );
    }

    const order = await createOrder(body);
    return NextResponse.json({ order: toPublicOrder(order) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
