// lib/api/auth.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createServerClient,
  type CookieOptions,
  type SupabaseClient,
} from "@supabase/ssr";
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
 * Wrapper per route protette (App Router, Next 15).
 * - Accetta qualsiasi shape di `context` (anche `{ params: Promise<{}> }`)
 * - Normalizza `params` (attende la Promise se presente)
 *
 * Uso:
 *   export const GET = withAuth(async ({ request, params, user, supabase }) => { ... })
 *   export const POST = withAuth(async ({ request, params, user, supabase }) => { ... })
 */
type WithAuthArgs = {
  request: Request;
  params?: Record<string, string | string[]>;
  user: User;
  supabase: SupabaseClient;
};

export function withAuth(
  handler: (args: WithAuthArgs) => Promise<Response> | Response
) {
  // NB: firmiamo con `any` per essere compatibili con i tipi runtime di Next 15
  return async (request: any, context: any) => {
    const supabase = await getServerSupabase();
    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      return jsonError("Unauthorized", 401);
    }

    // Normalizza params: se Next li fornisce come Promise<{}>, attendiamoli.
    let normalizedParams: Record<string, string | string[]> | undefined = undefined;
    try {
      const maybeParams = context?.params;
      if (maybeParams && typeof maybeParams.then === "function") {
        const awaited = await maybeParams;
        normalizedParams = (awaited ?? undefined) as any;
      } else {
        normalizedParams = (maybeParams ?? undefined) as any;
      }
    } catch {
      normalizedParams = undefined;
    }

    return handler({
      request: request as Request,
      params: normalizedParams,
      user: data.user,
      supabase,
    });
  };
}
