// app/auth/callback/route.ts
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  // cookie store SCRIVIBILE (Next 15: async)
  const store = await cookies();

  const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get: (name) => store.get(name)?.value,
      set: (name, value, options) => {
        store.set({ name, value, ...options });
      },
      remove: (name, options) => {
        store.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  if (code) {
    // scambia il codice con la sessione e SCRIVE i cookie
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, origin));
}
