// app/auth/callback/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirect = url.searchParams.get("redirect");
  const origin = url.origin;

  // destinazione finale dopo il login
  const target =
    redirect && redirect.startsWith("/")
      ? `${origin}${redirect}`
      : `${origin}/profile`;

  // response DI REDIRECT su cui scriveremo i cookie
  const res = NextResponse.redirect(target);

  if (code) {
    // cookies() è async in Next 15
    const reqCookies = await cookies();

    const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
      cookies: {
        get(name: string) {
          return reqCookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // scriviamo i Set-Cookie sulla response di redirect
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    });

    // Scambia il "code" per la sessione e popola i cookie HttpOnly
    await supabase.auth.exchangeCodeForSession(code);
  }

  return res;
}
