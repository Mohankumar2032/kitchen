"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

export function ThemePicker() {
  const { theme, setTheme, options, ready } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = options.find((o) => o.id === theme) ?? options[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-border bg-white/85 px-2.5 hover:border-[var(--hover-border)] hover:bg-[var(--hover-tint)] hover:text-theme sm:px-3"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose theme"
        title="Choose theme"
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          {current.swatches.map((color) => (
            <span
              key={color}
              className="h-3.5 w-3.5 rounded-full border border-black/10"
              style={{ background: color }}
            />
          ))}
        </span>
        <span className="hidden sm:inline">
          {ready ? current.label.replace("Light ", "") : "Theme"}
        </span>
        <i className="fa-solid fa-chevron-down text-[10px] opacity-70" aria-hidden />
      </button>

      {open ? (
        <div
          className="panel absolute right-0 z-50 mt-2 w-[240px] p-2 shadow-[0_12px_30px_rgba(17,24,39,0.12)]"
          role="listbox"
          aria-label="Theme options"
        >
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Light themes
          </p>
          <div className="space-y-1">
            {options.map((option) => {
              const active = option.id === theme;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[6px] px-2 py-2 text-left transition-colors",
                    active
                      ? "bg-[var(--hover-tint)] text-theme"
                      : "hover:bg-[var(--hover-tint)]"
                  )}
                  onClick={() => {
                    setTheme(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-0.5" aria-hidden>
                    {option.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-[11px] text-muted">
                      {option.description}
                    </span>
                  </span>
                  {active ? (
                    <i className="fa-solid fa-check text-theme" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
