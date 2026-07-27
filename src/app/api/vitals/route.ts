import { NextResponse } from "next/server";


interface VitalPayload {
  name?: string;
  value?: number;
  id?: string;
  rating?: string;
  navigationType?: string;
  delta?: number;
}

/**
 * Lightweight intake for Core Web Vitals. Logs structured metrics for production monitoring.
 */
export async function POST(req: Request) {
  let body: VitalPayload;
  try {
    body = (await req.json()) as VitalPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body?.name || typeof body.value !== "number") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  console.info(
    JSON.stringify({
      type: "web-vital",
      name: body.name,
      value: body.value,
      id: body.id,
      rating: body.rating,
      navigationType: body.navigationType,
      delta: body.delta,
      at: new Date().toISOString(),
    })
  );

  return NextResponse.json({ ok: true });
}
