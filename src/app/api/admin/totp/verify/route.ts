import { NextResponse } from "next/server";
import {
  ADMIN_PREAUTH_COOKIE,
  adminSessionCookieOptions,
  clearCookieOptions,
  createAdminSessionToken,
  getPreauthFromRequest,
} from "@/lib/admin-auth";
import { getEnrolledTotpSecret, verifyTotpCode } from "@/lib/admin-totp";

/** Complete login with Microsoft Authenticator code. */
export async function POST(req: Request) {
  const preauth = await getPreauthFromRequest(req);
  if (!preauth.ok) {
    return NextResponse.json(
      { error: "Sign in with password first" },
      { status: 401 }
    );
  }

  const secret = await getEnrolledTotpSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Authenticator is not set up yet", next: "setup" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = (body?.code || "").trim();

  if (!verifyTotpCode(secret, code)) {
    return NextResponse.json(
      { error: "Invalid authenticator code" },
      { status: 401 }
    );
  }

  const session = await createAdminSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearCookieOptions(ADMIN_PREAUTH_COOKIE));
  res.cookies.set(adminSessionCookieOptions(session));
  return res;
}
