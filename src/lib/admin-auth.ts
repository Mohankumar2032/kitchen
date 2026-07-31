export const ADMIN_SESSION_COOKIE = "kitchen_admin_session";
export const ADMIN_PREAUTH_COOKIE = "kitchen_admin_preauth";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const PREAUTH_TTL_MS = 1000 * 60 * 10; // 10 minutes

function adminUsername(): string {
  return (process.env.ADMIN_USERNAME || "admin").trim();
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "kitchen-admin";
}

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "kitchen-dev-session-secret"
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]!);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return toBase64Url(sig);
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(message);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i)! ^ signature.charCodeAt(i)!;
  }
  return diff === 0;
}

async function signPayload(payload: string): Promise<string> {
  const sig = await hmacSign(payload);
  return `${toBase64Url(new TextEncoder().encode(payload))}.${sig}`;
}

async function readSignedPayload(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  let payload: string;
  try {
    payload = new TextDecoder().decode(fromBase64Url(payloadB64));
  } catch {
    return null;
  }
  if (!(await hmacVerify(payload, sig))) return null;
  return payload;
}

export function validateAdminCredentials(
  username: string,
  password: string
): boolean {
  return username.trim() === adminUsername() && password === adminPassword();
}

export async function createAdminSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  return signPayload(`v1:admin:${exp}`);
}

export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  const payload = await readSignedPayload(token);
  if (!payload) return false;
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "v1" || parts[1] !== "admin") {
    return false;
  }
  const exp = Number(parts[2]);
  return Number.isFinite(exp) && exp >= Date.now();
}

/** Short-lived cookie after password OK, before Microsoft Authenticator code. */
export async function createAdminPreauthToken(options?: {
  pendingSecret?: string;
}): Promise<string> {
  const exp = Date.now() + PREAUTH_TTL_MS;
  if (options?.pendingSecret) {
    return signPayload(`v1:preauth:${exp}:setup:${options.pendingSecret}`);
  }
  return signPayload(`v1:preauth:${exp}`);
}

export async function verifyAdminPreauthToken(
  token: string | undefined | null
): Promise<{ ok: true; pendingSecret?: string } | { ok: false }> {
  const payload = await readSignedPayload(token);
  if (!payload) return { ok: false };
  const parts = payload.split(":");
  if (parts.length < 3 || parts[0] !== "v1" || parts[1] !== "preauth") {
    return { ok: false };
  }
  const exp = Number(parts[2]);
  if (!Number.isFinite(exp) || exp < Date.now()) return { ok: false };
  if (parts[3] === "setup" && parts[4]) {
    return { ok: true, pendingSecret: parts[4] };
  }
  return { ok: true };
}

export function adminSessionCookieOptions(token: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function adminPreauthCookieOptions(token: string) {
  return {
    name: ADMIN_PREAUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(PREAUTH_TTL_MS / 1000),
  };
}

export function clearCookieOptions(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

function cookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  return verifyAdminSessionToken(cookieValue(req, ADMIN_SESSION_COOKIE));
}

export async function getPreauthFromRequest(req: Request) {
  return verifyAdminPreauthToken(cookieValue(req, ADMIN_PREAUTH_COOKIE));
}

export async function requireAdminApi(req: Request): Promise<Response | null> {
  if (await isAdminRequest(req)) return null;
  return Response.json({ error: "Admin login required" }, { status: 401 });
}
