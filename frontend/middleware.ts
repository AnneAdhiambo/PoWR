import { NextRequest, NextResponse } from "next/server";

const reservedHosts = new Set(["www", "app", "api"]);

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() || "";
  const suffix = hostname.endsWith(".powr.localhost") ? ".powr.localhost" : ".powr.dev";
  const isTenantHost = hostname.endsWith(suffix);
  const slug = isTenantHost ? hostname.slice(0, -suffix.length) : "";

  if (!isTenantHost || !slug || reservedHosts.has(slug) || request.nextUrl.pathname.startsWith("/recruiter")) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set("x-powr-tenant-hostname", hostname);

  const isPublicCareersPath = request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/jobs" || request.nextUrl.pathname.startsWith("/jobs/");
  if (!isPublicCareersPath) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/jobs";
    return NextResponse.rewrite(destination, { request: { headers } });
  }

  if (request.nextUrl.pathname === "/") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/jobs";
    return NextResponse.rewrite(destination, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
