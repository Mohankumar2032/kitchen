import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <i className="fa-solid fa-kitchen-set text-theme" aria-hidden />
          Kitchen
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/admin/products" className="text-muted hover:text-theme">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
