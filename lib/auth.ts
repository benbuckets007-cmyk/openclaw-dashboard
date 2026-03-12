import { NextResponse } from "next/server";

export function isAuthorizedRequest(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return true;
  }

  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);

  if (origin && origin === requestUrl.origin) {
    return true;
  }

  const headerSecret =
    request.headers.get("x-admin-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerSecret === adminSecret;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized. Provide x-admin-secret or Authorization: Bearer <secret>." },
    { status: 401 },
  );
}
