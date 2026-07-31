import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<Settings>;
  const patch: Partial<Settings> = {};

  if (typeof body.defaultCommissionPercent === "number") {
    patch.defaultCommissionPercent = Math.min(
      100,
      Math.max(0, body.defaultCommissionPercent)
    );
  }
  if (typeof body.storeName === "string" && body.storeName.trim()) {
    patch.storeName = body.storeName.trim();
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    patch.currency = body.currency.trim();
  }
  if (typeof body.shippingFee === "number") {
    patch.shippingFee = Math.max(0, body.shippingFee);
  }
  if (typeof body.freeShippingAbove === "number") {
    patch.freeShippingAbove = Math.max(0, body.freeShippingAbove);
  }
  if (typeof body.upiId === "string" && body.upiId.trim()) {
    patch.upiId = body.upiId.trim();
  }
  if (typeof body.upiMobile === "string" && body.upiMobile.trim()) {
    patch.upiMobile = body.upiMobile.trim();
  }
  if (typeof body.upiPayee === "string" && body.upiPayee.trim()) {
    patch.upiPayee = body.upiPayee.trim();
  }

  const settings = await updateSettings(patch);
  return NextResponse.json({ settings });
}
