// lib/api/auth.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Supabase server legato ai cookie della request (read-only qui)
// La scrittura/refresh cookie avviene nel middleware e nel callback OAuth.
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (error || !user) {
    return { user: null, supabase, error: "Unauthorized" as const };
  }
  return { user, supabase, error: null as null };
}
