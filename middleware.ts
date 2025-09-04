// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  // Cloniamo l'header per poterlo passare a NextResponse
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  // Questo fa refresh automatico dei cookie se necessario
  await supabase.auth.getUser();

  return res;
}

// Escludiamo file statici e asset
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sentry|.*\\.(?:js|css|png|jpg|svg|ico)).*)"],
};
