"use client";

import { useState, useTransition } from "react";
import type { Settings } from "@/lib/types";

export function CommissionPanel({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [value, setValue] = useState(String(initial.defaultCommissionPercent));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const next = Math.min(100, Math.max(0, Number(value) || 0));
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCommissionPercent: next }),
      });
      if (!res.ok) {
        setMessage("Could not save commission.");
        return;
      }
      const data = (await res.json()) as { settings: Settings };
      setSettings(data.settings);
      setValue(String(data.settings.defaultCommissionPercent));
      setMessage("Default commission saved.");
    });
  }

  return (
    <div className="fade-up mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">% Commission</h1>
        <p className="mt-1 text-muted">
          Default commission applied to products that do not have an override.
          You can still set per-product % from the Products table.
        </p>
      </div>

      <div className="rounded-[6px] border border-border p-4">
        <label className="mb-2 block font-medium" htmlFor="default-commission">
          Default commission %
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="default-commission"
            className="input w-32"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={save}
          >
            Save
          </button>
        </div>
        <p className="mt-3 text-muted">
          Current default: {settings.defaultCommissionPercent}% · Store:{" "}
          {settings.storeName}
        </p>
        {message ? (
          <p className="mt-2 text-success" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
