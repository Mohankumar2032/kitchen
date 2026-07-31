import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  ADMIN_PREAUTH_COOKIE,
  adminPreauthCookieOptions,
  adminSessionCookieOptions,
  clearCookieOptions,
  createAdminPreauthToken,
  createAdminSessionToken,
  getPreauthFromRequest,
} from "@/lib/admin-auth";
import {
  adminTotpIssuer,
  adminTotpLabel,
  buildTotpUri,
  generateTotpSecret,
  isTotpEnrolled,
  saveEnrolledTotpSecret,
  verifyTotpCode,
} from "@/lib/admin-totp";

/** Start Microsoft Authenticator enrollment — returns QR + manual key. */
export async function GET(req: Request) {
  const preauth = await getPreauthFromRequest(req);
  if (!preauth.ok) {
    return NextResponse.json(
      { error: "Sign in with password first" },
      { status: 401 }
    );
  }

  if (await isTotpEnrolled()) {
    return NextResponse.json(
      { error: "Authenticator is already set up. Enter your app code." },
      { status: 400 }
    );
  }

  const secret = preauth.pendingSecret || generateTotpSecret();
  const uri = buildTotpUri(secret);
  const qrDataUrl = await QRCode.toDataURL(uri, {
    width: 220,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const res = NextResponse.json({
    qrDataUrl,
    secret,
    issuer: adminTotpIssuer(),
    account: adminTotpLabel(),
  });

  // Persist pending secret in preauth cookie until the first valid code.
  if (!preauth.pendingSecret) {
    const token = await createAdminPreauthToken({ pendingSecret: secret });
    res.cookies.set(adminPreauthCookieOptions(token));
  }

  return res;
}

/** Confirm setup with a code from Microsoft Authenticator. */
export async function POST(req: Request) {
  const preauth = await getPreauthFromRequest(req);
  if (!preauth.ok || !preauth.pendingSecret) {
    return NextResponse.json(
      { error: "Restart login and scan the QR again" },
      { status: 401 }
    );
  }

  if (await isTotpEnrolled()) {
    return NextResponse.json(
      { error: "Authenticator is already set up" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = (body?.code || "").trim();

  if (!verifyTotpCode(preauth.pendingSecret, code)) {
    return NextResponse.json(
      { error: "Invalid authenticator code. Try the current 6-digit code." },
      { status: 401 }
    );
  }

  await saveEnrolledTotpSecret(preauth.pendingSecret);
  const session = await createAdminSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearCookieOptions(ADMIN_PREAUTH_COOKIE));
  res.cookies.set(adminSessionCookieOptions(session));
  return res;
}
