import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasAdminAccess(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return true;
  }

  const origin = request.headers.get("origin");
  if (origin && origin === request.nextUrl.origin) {
    return true;
  }

  const headerSecret =
    request.headers.get("x-admin-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerSecret === adminSecret;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/webhooks/telegram")) {
    return NextResponse.next();
  }

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return NextResponse.next();
  }

  if (hasAdminAccess(request)) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "Unauthorized. Provide x-admin-secret or Authorization: Bearer <secret>." },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
