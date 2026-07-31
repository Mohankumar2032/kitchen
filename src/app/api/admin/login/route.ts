import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminPreauthCookieOptions,
  clearCookieOptions,
  createAdminPreauthToken,
  validateAdminCredentials,
} from "@/lib/admin-auth";
import { isTotpEnrolled } from "@/lib/admin-totp";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = (body?.username || "").trim();
  const password = body?.password || "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const enrolled = await isTotpEnrolled();
  const preauth = await createAdminPreauthToken();
  const res = NextResponse.json({
    ok: true,
    next: enrolled ? "totp" : "setup",
  });

  // Password alone is not enough once Authenticator is enabled.
  res.cookies.set(clearCookieOptions(ADMIN_SESSION_COOKIE));
  res.cookies.set(adminPreauthCookieOptions(preauth));
  return res;
}
