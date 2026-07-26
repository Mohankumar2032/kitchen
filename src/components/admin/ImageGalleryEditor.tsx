"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { isUnoptimizedImage } from "@/lib/images";
import { cn } from "@/lib/utils";

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
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Upload failed.");
        return;
      }
      onChange([...images, data.url]);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  const busy = disabled || pending;

  return (
    <div className="space-y-3 rounded-[6px] border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium text-foreground">Product images</div>
          <p className="text-muted">
            First image is the cover. Paste Meesho CDN URLs or upload your own.
          </p>
        </div>
        <span className="text-muted">{images.length}/12</span>
      </div>

      {images.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {images.map((src, index) => (
            <li
              key={`${src}-${index}`}
              className="flex items-center gap-2 rounded-[6px] border border-border bg-white p-2"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-surface">
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                  unoptimized={isUnoptimizedImage(src)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-muted" title={src}>
                  {src}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {index === 0 ? (
                    <span className="text-[11px] font-medium text-theme">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost !px-2 !py-1 text-[11px]"
                      disabled={busy}
                      onClick={() => makeCover(index)}
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-[11px]"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move earlier"
                  >
                    <i className="fa-solid fa-arrow-up" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-[11px]"
                    disabled={busy || index === images.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move later"
                  >
                    <i className="fa-solid fa-arrow-down" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-[11px] text-danger"
                    disabled={busy}
                    onClick={() => removeAt(index)}
                    aria-label="Remove image"
                  >
                    <i className="fa-solid fa-trash" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[6px] border border-dashed border-border bg-white px-3 py-4 text-center text-muted">
          No images yet — paste a URL or upload a file.
        </p>
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
          className="btn btn-ghost"
          disabled={busy || !urlDraft.trim()}
          onClick={addUrl}
        >
          <i className="fa-solid fa-link" aria-hidden />
          Add URL
        </button>
        <label
          className={cn(
            "btn btn-primary cursor-pointer",
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
        <p className="text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-muted">
          Upload uses Vercel Blob when{" "}
          <code className="text-[12px]">BLOB_READ_WRITE_TOKEN</code> is set;
          otherwise files go to <code className="text-[12px]">/uploads</code>{" "}
          locally.
        </p>
      )}
    </div>
  );
}
