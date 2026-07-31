import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getOrderById, updateOrder } from "@/lib/store";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { toPublicOrder } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "fulfilling",
  "shipped",
  "cancelled",
];

const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "submitted", "verified"];

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order: toPublicOrder(order) });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    utr?: string | null;
  };

  const wantsAdminFields =
    body.status !== undefined || body.paymentStatus !== undefined;

  // Customers may submit/update UTR only. Status changes require admin login.
  if (wantsAdminFields) {
    const denied = await requireAdminApi(req);
    if (denied) return denied;
  }

  const patch: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    utr?: string | null;
  } = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }
    patch.paymentStatus = body.paymentStatus;
  }

  if (Object.prototype.hasOwnProperty.call(body, "utr")) {
    patch.utr = body.utr ?? null;
  }

  if (
    patch.status === undefined &&
    patch.paymentStatus === undefined &&
    !Object.prototype.hasOwnProperty.call(patch, "utr")
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const order = await updateOrder(id, patch);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order: toPublicOrder(order) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
