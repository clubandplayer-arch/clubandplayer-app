// app/api/auth/whoami/route.ts
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const store = await cookies();
  const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get: (n) => store.get(n)?.value,
      set() {},
      remove() {},
    },
  });
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
