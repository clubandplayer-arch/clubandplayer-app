// lib/api/auth.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions, type SupabaseClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Risposta JSON di errore */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Client Supabase lato server collegato ai cookie della request (Next 15: cookies() è async) */
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

/** Tipo di ritorno compatibile con vecchie route che destrutturano ctx/res */
export type RequireUserResult =
  | {
      user: any;
      supabase: SupabaseClient;
      error: "Unauthorized";
      ctx?: any;
      res?: any;
    }
  | {
      user: User;
      supabase: SupabaseClient;
      error: null;
      ctx?: any;
      res?: any;
    };

/** Verifica utente loggato (compat: aggiunge campi opzionali ctx/res) */
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (error || !user) {
    return { user: null, supabase, error: "Unauthorized", ctx: undefined, res: undefined };
  }
  return { user, supabase, error: null, ctx: undefined, res: undefined };
}

/**
 * Wrapper semplice per proteggere handler (REST in app router).
 * Mantiene compatibilità con la tua firma attuale delle route.
 *
 * Uso:
 *   export const POST = withAuth(async ({ request, params, user, supabase }) => { ... })
 */
type WithAuthArgs = {
  request: Request;
  params?: Record<string, string | string[]>;
  user: User;
  supabase: SupabaseClient;
};

export function withAuth<
  H extends (args: WithAuthArgs) => Promise<Response> | Response
>(handler: H) {
  return async (request: Request, context?: { params?: WithAuthArgs["params"] }) => {
    const supabase = await getServerSupabase();
    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      return jsonError("Unauthorized", 401);
    }

    return handler({
      request,
      params: context?.params,
      user: data.user,
      supabase,
    });
  };
}
