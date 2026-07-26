"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { isEphemeralUploadPath, isUnoptimizedImage } from "@/lib/images";
import { cn } from "@/lib/utils";

function GalleryThumb({
  src,
  isCover,
}: {
  src: string;
  isCover: boolean;
}) {
  const [broken, setBroken] = useState(
    () => isEphemeralUploadPath(src)
  );

  return (
    <div className="relative aspect-square bg-surface">
      {broken ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          <i
            className="fa-regular fa-image text-lg text-muted"
            aria-hidden
          />
          <span className="text-[10px] font-medium text-[var(--danger)]">
            Missing file
          </span>
          <span className="line-clamp-2 break-all text-[10px] text-muted">
            {isEphemeralUploadPath(src)
              ? "Local upload — not on Vercel"
              : "Broken URL"}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          sizes="160px"
          className="object-contain p-2"
          unoptimized={isUnoptimizedImage(src)}
          onError={() => setBroken(true)}
        />
      )}
      {isCover ? (
        <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-theme px-1.5 py-0.5 text-[10px] font-semibold text-white">
          Cover
        </span>
      ) : null}
    </div>
  );
}

export function ImageGalleryEditor({
  images,
  onChange,
  disabled,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function addUrl() {
    setError(null);
    const url = urlDraft.trim();
    if (!url) return;
    if (!(url.startsWith("https://") || url.startsWith("/"))) {
      setError("Use an https:// Meesho/CDN URL or a /path.");
      return;
    }
    if (url.startsWith("/uploads/")) {
      setError(
        "Local /uploads paths do not work on Vercel. Paste an https:// image URL or use Upload (Blob)."
      );
      return;
    }
    if (images.includes(url)) {
      setError("That image is already in the gallery.");
      return;
    }
    if (images.length >= 12) {
      setError("Maximum 12 images per product.");
      return;
    }
    onChange([...images, url]);
    setUrlDraft("");
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function removeBroken() {
    onChange(images.filter((src) => !isEphemeralUploadPath(src)));
  }

  function move(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.unshift(item);
    onChange(copy);
  }

  function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);

    if (images.length >= 12) {
      setError("Maximum 12 images per product.");
      return;
    }

    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(
            data.error ||
              "Upload failed. For Meesho images, paste the URL and click Add URL."
          );
          return;
        }
        onChange([...images, data.url]);
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        setError(
          "Upload failed. For Meesho images, paste the URL and click Add URL."
        );
      }
    });
  }

  const busy = disabled || pending;
  const brokenCount = images.filter(isEphemeralUploadPath).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Images</p>
          <p className="text-[12px] text-muted">
            First image is the storefront cover
          </p>
        </div>
        <span className="rounded-[6px] bg-surface px-2 py-1 text-[12px] font-medium text-muted">
          {images.length}/12
        </span>
      </div>

      {brokenCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[var(--danger)]">
          <span>
            {brokenCount} image{brokenCount === 1 ? "" : "s"} missing on the
            server (old local upload).
          </span>
          <button
            type="button"
            className="font-semibold underline"
            disabled={busy}
            onClick={removeBroken}
          >
            Remove missing
          </button>
        </div>
      ) : null}

      {images.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((src, index) => (
            <li
              key={`${src}-${index}`}
              className={cn(
                "overflow-hidden rounded-[6px] border bg-white",
                isEphemeralUploadPath(src)
                  ? "border-[#fecaca]"
                  : "border-border"
              )}
            >
              <GalleryThumb src={src} isCover={index === 0} />
              <div className="flex items-center justify-between gap-1 border-t border-border px-1.5 py-1.5">
                {index === 0 ? (
                  <span className="px-1 text-[11px] font-medium text-muted">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded-[4px] px-1.5 py-1 text-[11px] font-medium text-theme hover:bg-surface"
                    disabled={busy}
                    onClick={() => makeCover(index)}
                  >
                    Make cover
                  </button>
                )}
                <div className="flex items-center">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted hover:bg-surface hover:text-foreground disabled:opacity-40"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move earlier"
                  >
                    <i className="fa-solid fa-arrow-up text-[11px]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted hover:bg-surface hover:text-foreground disabled:opacity-40"
                    disabled={busy || index === images.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move later"
                  >
                    <i className="fa-solid fa-arrow-down text-[11px]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted hover:bg-[#fef2f2] hover:text-[var(--danger)] disabled:opacity-40"
                    disabled={busy}
                    onClick={() => removeAt(index)}
                    aria-label="Remove image"
                  >
                    <i className="fa-solid fa-trash text-[11px]" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[6px] border border-dashed border-border bg-surface px-3 py-8 text-center text-[12px] text-muted">
          No images yet — paste a CDN URL or upload a file
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="https://images.meesho.com/..."
          value={urlDraft}
          disabled={busy}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-ghost min-h-10 shrink-0"
          disabled={busy || !urlDraft.trim()}
          onClick={addUrl}
        >
          <i className="fa-solid fa-link" aria-hidden />
          Add URL
        </button>
        <label
          className={cn(
            "btn btn-primary min-h-10 shrink-0 cursor-pointer",
            busy && "pointer-events-none opacity-55"
          )}
        >
          <i className="fa-solid fa-cloud-arrow-up" aria-hidden />
          {pending ? "Uploading…" : "Upload"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFileChange(e.target.files)}
          />
        </label>
      </div>

      {error ? (
        <p className="text-[12px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-muted">
          Prefer <strong>Add URL</strong> for Meesho/CDN links. Use{" "}
          <strong>Upload</strong> for your own photos (Vercel Blob).
        </p>
      )}
    </div>
  );
}
