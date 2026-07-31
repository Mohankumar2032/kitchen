import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

function isPublicAdminAuthPath(pathname: string): boolean {
  return (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout" ||
    pathname.startsWith("/api/admin/totp/")
  );
}

function isAdminPage(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApi(pathname: string, method: string): boolean {
  const m = method.toUpperCase();

  if (pathname === "/api/orders" && m === "GET") return true;
  if (pathname === "/api/products" && (m === "POST" || m === "PUT")) return true;
  if (
    pathname.startsWith("/api/products/") &&
    (m === "PATCH" || m === "DELETE")
  )
    return true;
  if (pathname === "/api/categories" && m === "POST") return true;
  if (pathname === "/api/settings" && m === "PATCH") return true;
  if (pathname === "/api/uploads" && m === "POST") return true;

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (isPublicAdminAuthPath(pathname)) {
    const requestHeaders = new Headers(req.headers);
    if (pathname === "/admin/login") {
      requestHeaders.set("x-admin-login", "1");
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const needsAdmin = isAdminPage(pathname) || isAdminApi(pathname, method);
  if (!needsAdmin) return NextResponse.next();

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const ok = await verifyAdminSessionToken(token);

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Admin login required" },
        { status: 401 }
      );
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set(
      "next",
      `${pathname}${req.nextUrl.search || ""}`
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
