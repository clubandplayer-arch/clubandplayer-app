// lib/api/auth.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

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
      // la scrittura/refresh cookie avviene nel middleware e nel callback OAuth
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

/** Firma a 1 argomento (object) */
export type WithAuthArgs = {
  request: Request;
  params?: Record<string, string | string[]>;
  user: User;
  supabase: SupabaseClient;
};

/** Firma a 2 argomenti (req, { supabase, user, params }) */
type WithAuthExtras = {
  supabase: SupabaseClient;
  user: User;
  params?: Record<string, string | string[]>;
};

/**
 * Wrapper per route protette (App Router, Next 15).
 * Supporta entrambe le firme:
 *   1) withAuth(async ({ request, params, user, supabase }) => Response)
 *   2) withAuth(async (request, { params, user, supabase }) => Response)
 *
 * Inoltre normalizza `params` quando Next li passa come Promise<{}>.
 */
// Overload delle firme supportate
export function withAuth(
  handler: (args: WithAuthArgs) => Promise<Response> | Response
): (request: any, context?: any) => Promise<Response>;
export function withAuth(
  handler: (request: any, extras: WithAuthExtras) => Promise<Response> | Response
): (request: any, context?: any) => Promise<Response>;
export function withAuth(handler: any) {
  return async (request: any, context?: any) => {
    const supabase = await getServerSupabase();
    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      return jsonError("Unauthorized", 401);
    }

    // Normalizza params (Next 15 può passarli come Promise<{}>)
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

    // Se l'handler accetta 2 argomenti, usiamo (req, { ...extras })
    if (handler.length >= 2) {
      return handler(request as Request, {
        supabase,
        user: data.user,
        params: normalizedParams,
      } as WithAuthExtras);
    }

    // Altrimenti passiamo un unico oggetto
    return handler({
      request: request as Request,
      params: normalizedParams,
      user: data.user,
      supabase,
    } as WithAuthArgs);
  };
}
