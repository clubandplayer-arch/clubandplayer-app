// lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client Supabase lato server che legge/scrive i cookie di Next. */
export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // @ts-ignore Next accetta opzioni compatibili
        cookieStore.set(name, value, options as any);
      },
      remove(name: string, options: CookieOptions) {
        // @ts-ignore
        cookieStore.set(name, '', { ...options, maxAge: 0 } as any);
      },
    },
  });
}
