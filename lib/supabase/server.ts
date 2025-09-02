// lib/supabase/server.ts
import { cookies as nextCookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * In Next 15 alcune tipizzazioni fanno sembrare cookies() asincrono.
 * A runtime, nei Route Handlers/Server Components è sincrono: adattiamo il tipo.
 */
function getCookieStore(): {
  get: (name: string) => { name: string; value: string } | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
} {
  // @ts-ignore – accettiamo sia ritorno sync che Promise; a runtime è sync qui
  const store = (nextCookies as any)();

  return {
    get(name: string) {
      return (store as any).get(name);
    },
    set(name: string, value: string, options?: CookieOptions) {
      (store as any).set(name, value, options as any);
    },
  };
}

/** Client Supabase lato server che legge/scrive i cookie di Next. */
export function supabaseServer() {
  const store = getCookieStore();

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        store.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        store.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * Alias retro-compatibile per le route che importano getSupabaseServerClient
 * e magari gli passano un cookie store. Accetta qualsiasi argomento e lo ignora.
 */
export function getSupabaseServerClient(..._args: any[]) {
  return supabaseServer();
}
