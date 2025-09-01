// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

// Tipo minimale per ciò che ci serve
type CookieStore = {
  get(name: string): { value?: string } | undefined;
  set?: (name: string, value: string, options?: any) => void;
  delete?: (name: string, options?: any) => void;
};

export function createSupabaseServerClient(cookieStore?: CookieStore) {
  // Preferisci quello passato dalle route (già await-ato), così evitiamo Promise
  const store: CookieStore = cookieStore ?? (nextCookies() as unknown as CookieStore);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          store.set?.(name, value, options);
        },
        remove(name: string, options?: any) {
          // API next/headers usa delete()
          store.delete?.(name, options);
        },
      },
    }
  );
}

// Back-compat per le route esistenti
export const getSupabaseServerClient = createSupabaseServerClient;
export default createSupabaseServerClient;
