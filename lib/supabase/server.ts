// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

/**
 * Crea un client Supabase lato server.
 * Accetta opzionalmente un cookieStore (es. il risultato di `await cookies()` nelle route),
 * ma funziona anche senza, usando il fallback `next/headers`.
 */
export function createSupabaseServerClient(providedStore?: unknown) {
  // Adattatore minimale: ci basta .get(name) -> { value?: string } | undefined
  const reqStore = providedStore as
    | { get: (name: string) => { value?: string } | undefined }
    | undefined;

  const fallbackStore = nextCookies();

  const getCookieValue = (name: string) => {
    // prova prima col providedStore (già await-ato nelle route), altrimenti fallback
    const fromProvided = reqStore?.get?.(name)?.value;
    if (fromProvided !== undefined) return fromProvided;
    return fallbackStore.get(name)?.value;
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookieValue(name);
        },
        // no-op lato SSR: non scriviamo cookie dalla route handler
        set() {},
        remove() {},
      },
    }
  );
}

// Back-compat per le route esistenti
export const getSupabaseServerClient = createSupabaseServerClient;
export default createSupabaseServerClient;
