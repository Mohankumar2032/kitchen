import { NextResponse } from "next/server";
import {
  ADMIN_PREAUTH_COOKIE,
  ADMIN_SESSION_COOKIE,
  clearCookieOptions,
} from "@/lib/admin-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearCookieOptions(ADMIN_SESSION_COOKIE));
  res.cookies.set(clearCookieOptions(ADMIN_PREAUTH_COOKIE));
  return res;
}
