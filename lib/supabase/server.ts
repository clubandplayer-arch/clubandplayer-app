// lib/supabase/server.ts
import { cookies as nextCookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * In Next 15 alcune definizioni tipizzano cookies() come Promise<ReadonlyRequestCookies>.
 * A runtime è sincrono nei Route Handlers/Server Components: forziamo un tipo compatibile.
 */
function getCookieStore(): {
  get: (name: string) => { name: string; value: string } | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
} {
  // @ts-ignore - accettiamo sia ritorno sync che Promise, ma a runtime è sync
  const store = (nextCookies as any)();

  return {
    get(name: string) {
      // store.get(name) deve esistere in entrambi i casi
      return (store as any).get(name);
    },
    set(name: string, value: string, options?: CookieOptions) {
      // Next accetta set(name, value, options)
      (store as any).set(name, value, options as any);
    },
  };
}

/**
 * Client Supabase lato server che legge/scrive i cookie di Next.
 * Usalo nei Route Handlers (/app/api/*) e nelle Server Components.
 */
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
 * Alias retro-compatibile per le route che importano getSupabaseServerClient.
 * (Equivale a supabaseServer())
 */
export function getSupabaseServerClient() {
  return supabaseServer();
}
