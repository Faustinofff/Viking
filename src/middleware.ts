import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_EMAIL = "viking.admin.fit@gmail.com";
const SUPABASE_REF = "xybyaiumxzwtrhggzwon";
const COOKIE_NAME = `sb-${SUPABASE_REF}-auth-token`;

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get(COOKIE_NAME);

  if (!authCookie) {
    if (request.nextUrl.pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const cookieData = JSON.parse(authCookie.value);
    const accessToken = cookieData.access_token;
    if (!accessToken) throw new Error("no token");

    const headers = new Headers(request.headers);
    headers.set("x-admin-token", accessToken);
    headers.set("x-admin-email-claim", ADMIN_EMAIL);
    return NextResponse.next({ request: { headers } });
  } catch {
    if (request.nextUrl.pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
