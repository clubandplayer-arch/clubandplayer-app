// app/auth/callback/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirect = url.searchParams.get("redirect"); // opzionale: dove tornare dopo il login
  const origin = url.origin;

  if (code) {
    const cookieStore = cookies();

    const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    });

    // Scambia il "code" per la sessione e scrive i cookie HttpOnly
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Torna alla pagina richiesta, al profilo, o alla home
  const target =
    redirect && redirect.startsWith("/")
      ? `${origin}${redirect}`
      : `${origin}/profile`;

  return NextResponse.redirect(target);
}
