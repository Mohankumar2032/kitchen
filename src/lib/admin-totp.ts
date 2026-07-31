import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import * as OTPAuth from "otpauth";

const TOTP_PATH = path.join(process.cwd(), "data", "admin-totp.json");
const BLOB_TOTP_PATH = "kitchen/admin-totp.json";

interface TotpStore {
  secret: string;
  enrolledAt: string;
}

function blobOpts() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? { token: process.env.BLOB_READ_WRITE_TOKEN }
    : {};
}

function shouldUseBlob(): boolean {
  return Boolean(
    process.env.VERCEL &&
      (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN)
  );
}

function envTotpSecret(): string | null {
  const value = (process.env.ADMIN_TOTP_SECRET || "").trim().replace(/\s+/g, "");
  return value || null;
}

export function adminTotpIssuer(): string {
  return (process.env.ADMIN_TOTP_ISSUER || "Kitchen Admin").trim();
}

export function adminTotpLabel(): string {
  return (process.env.ADMIN_USERNAME || "admin").trim();
}

function totpFromSecret(secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: adminTotpIssuer(),
    label: adminTotpLabel(),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildTotpUri(secret: string): string {
  return totpFromSecret(secret).toString();
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const delta = totpFromSecret(secret).validate({
    token: normalized,
    window: 1,
  });
  return delta !== null;
}

async function readStoredTotp(): Promise<TotpStore | null> {
  if (shouldUseBlob()) {
    try {
      const result = await get(BLOB_TOTP_PATH, {
        access: "public",
        useCache: false,
        ...blobOpts(),
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      const parsed = JSON.parse(text) as TotpStore;
      if (parsed?.secret) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  try {
    const raw = await fs.readFile(TOTP_PATH, "utf8");
    const parsed = JSON.parse(raw) as TotpStore;
    if (parsed?.secret) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function getEnrolledTotpSecret(): Promise<string | null> {
  const fromEnv = envTotpSecret();
  if (fromEnv) return fromEnv;
  const stored = await readStoredTotp();
  return stored?.secret ?? null;
}

export async function isTotpEnrolled(): Promise<boolean> {
  return Boolean(await getEnrolledTotpSecret());
}

export async function saveEnrolledTotpSecret(secret: string): Promise<void> {
  const payload: TotpStore = {
    secret: secret.replace(/\s+/g, "").toUpperCase(),
    enrolledAt: new Date().toISOString(),
  };

  if (shouldUseBlob()) {
    await put(BLOB_TOTP_PATH, JSON.stringify(payload, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      ...blobOpts(),
    });
    return;
  }

  await fs.mkdir(path.dirname(TOTP_PATH), { recursive: true });
  await fs.writeFile(TOTP_PATH, JSON.stringify(payload, null, 2), "utf8");
}
