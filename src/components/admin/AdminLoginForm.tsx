"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "credentials" | "setup" | "totp";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function safeNextPath(): string {
    const next = searchParams.get("next") || "/admin/orders";
    return next.startsWith("/admin") && !next.startsWith("/admin/login")
      ? next
      : "/admin/orders";
  }

  async function finishLogin() {
    router.replace(safeNextPath());
    router.refresh();
  }

  async function loadSetupQr(): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch("/api/admin/totp/setup", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        qrDataUrl?: string;
        secret?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.qrDataUrl || !data.secret) {
        setError(data?.error || "Could not start Authenticator setup");
        setStep("credentials");
        return false;
      }
      setQrDataUrl(data.qrDataUrl);
      setManualSecret(data.secret);
      setStep("setup");
      return true;
    } catch {
      setError("Network error. Please try again.");
      setStep("credentials");
      return false;
    }
  }

  async function onCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => null)) as {
        next?: "totp" | "setup";
        error?: string;
      } | null;

      if (!res.ok) {
        setError(data?.error || "Login failed");
        return;
      }

      setCode("");
      if (data?.next === "setup") {
        await loadSetupQr();
      } else {
        setStep("totp");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function onSetupConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error || "Could not verify authenticator");
        return;
      }
      await finishLogin();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function onTotpVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        next?: string;
      } | null;
      if (!res.ok) {
        if (data?.next === "setup") {
          await loadSetupQr();
          return;
        }
        setError(data?.error || "Invalid authenticator code");
        return;
      }
      await finishLogin();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel w-full max-w-md space-y-4 p-5 sm:p-6">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[6px] bg-[color-mix(in_srgb,var(--theme)_12%,#fff)] text-theme">
          <i
            className={`fa-solid ${
              step === "credentials" ? "fa-kitchen-set" : "fa-shield-halved"
            } text-xl`}
            aria-hidden
          />
        </span>
        <h1 className="mt-3 text-[22px] font-bold tracking-tight">
          {step === "credentials"
            ? "Admin login"
            : step === "setup"
              ? "Set up Microsoft Authenticator"
              : "Authenticator code"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {step === "credentials"
            ? "Sign in with your admin password, then approve with Microsoft Authenticator."
            : step === "setup"
              ? "Scan this QR in Microsoft Authenticator, then enter the 6-digit code."
              : "Open Microsoft Authenticator and enter the current 6-digit code."}
        </p>
      </div>

      {step === "credentials" ? (
        <form onSubmit={onCredentials} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold">
              Username
            </span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold">
              Password
            </span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="text-[13px] text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="btn btn-primary min-h-11 w-full"
            disabled={pending}
          >
            {pending ? "Checking…" : "Continue"}
          </button>
        </form>
      ) : null}

      {step === "setup" ? (
        <form onSubmit={onSetupConfirm} className="space-y-4">
          <div className="rounded-[6px] border border-border bg-surface/50 p-3 text-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Microsoft Authenticator QR code"
                width={200}
                height={200}
                className="mx-auto h-[200px] w-[200px]"
              />
            ) : (
              <p className="py-16 text-[13px] text-muted">Loading QR…</p>
            )}
            {manualSecret ? (
              <p className="mt-2 break-all text-[11px] text-muted">
                Or enter key manually:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {manualSecret}
                </span>
              </p>
            ) : null}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-[12px] text-muted">
            <li>Open Microsoft Authenticator</li>
            <li>Add account → Other (Google, GitHub, etc.) / Scan QR</li>
            <li>Scan the QR above</li>
            <li>Enter the 6-digit code shown in the app</li>
          </ol>
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold">
              6-digit code
            </span>
            <input
              className="input text-center text-[18px] tracking-[0.3em]"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              required
              autoFocus
            />
          </label>
          {error ? (
            <p className="text-[13px] text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              className="btn btn-ghost min-h-11 flex-1"
              disabled={pending}
              onClick={() => {
                setStep("credentials");
                setCode("");
                setError(null);
                setQrDataUrl(null);
                setManualSecret(null);
              }}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary min-h-11 flex-1"
              disabled={pending || code.length !== 6}
            >
              {pending ? "Verifying…" : "Enable Authenticator"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "totp" ? (
        <form onSubmit={onTotpVerify} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold">
              Microsoft Authenticator code
            </span>
            <input
              className="input text-center text-[18px] tracking-[0.3em]"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              required
              autoFocus
            />
          </label>
          {error ? (
            <p className="text-[13px] text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              className="btn btn-ghost min-h-11 flex-1"
              disabled={pending}
              onClick={() => {
                setStep("credentials");
                setCode("");
                setError(null);
              }}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary min-h-11 flex-1"
              disabled={pending || code.length !== 6}
            >
              {pending ? "Verifying…" : "Sign in"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
