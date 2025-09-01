// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

/**
 * Crea un client Supabase lato server.
 * Accetta opzionalmente un cookieStore (es. risultato di `await cookies()` nelle route).
 * Rimane sincrona per compatibilità con le route esistenti.
 */
export function createSupabaseServerClient(providedStore?: unknown) {
  // Cast permissivo: gestiamo sia ReadonlyRequestCookies sia Promise<ReadonlyRequestCookies>
  const provided: any = providedStore as any;
  const fallback: any = nextCookies() as any;

  const getCookieValue = (name: string) => {
    // 1) prova dal provided store (già await-ato nelle route)
    const fromProvided = provided?.get?.(name)?.value;
    if (fromProvided !== undefined) return fromProvided;

    // 2) fallback: se è una Promise, evitiamo di usarla (non possiamo await-are in funzione sync)
    if (typeof fallback?.then === "function") {
      return undefined;
    }

    // 3) fallback sincrono
    return fallback?.get?.(name)?.value;
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookieValue(name);
        },
        // no-op lato SSR: non scriviamo cookie dalla route
        set() {},
        remove() {},
      },
    }
  );
}

// Back-compat per le route esistenti
export const getSupabaseServerClient = createSupabaseServerClient;
export default createSupabaseServerClient;
