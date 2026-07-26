const MAX_IMAGES = 12;

/** Normalize + validate product image URL list from admin / API. */
export function sanitizeImageList(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;

  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") return null;
    const url = item.trim();
    if (!url || url.length > 2048) return null;
    if (!(url.startsWith("/") || url.startsWith("https://"))) return null;
    if (url.startsWith("//") || url.includes("..")) return null;
    out.push(url);
    if (out.length > MAX_IMAGES) return null;
  }
  return out;
}

export function isImageSrc(url: string): boolean {
  return url.startsWith("/") || url.startsWith("https://");
}

export function isUnoptimizedImage(url: string): boolean {
  return (
    url.endsWith(".svg") ||
    url.includes(".svg?") ||
    // Meesho / CDN URLs often fail Next image optimization; serve direct
    url.startsWith("https://")
  );
}

/** Local /uploads files are gitignored and missing on Vercel. */
export function isEphemeralUploadPath(url: string): boolean {
  return url.startsWith("/uploads/");
}
