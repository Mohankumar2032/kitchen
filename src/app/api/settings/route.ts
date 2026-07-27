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

  const settings = await updateSettings(patch);
  return NextResponse.json({ settings });
}
