import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/api/admin/:path*"],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hasCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasCookie) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  return NextResponse.next();
}
