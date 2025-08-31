import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hasSession = req.cookies.get("sb-access-token"); // cookie di Supabase

  // Se non loggato e tenta di accedere a dashboard → redirect al login
  if (!hasSession && url.pathname.startsWith("/app")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
