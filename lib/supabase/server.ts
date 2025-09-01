// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/supabase";

/**
 * Crea un client Supabase server-side usando un cookieStore esterno.
 * Passa il risultato di `await cookies()` dal route handler.
 */
export function getSupabaseServerClient(cookieStore: any) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // In alcuni ambienti (build) set/remove non sono necessari: falliscono in no-op
          try {
            cookieStore.set?.({ name, value, ...options });
          } catch {
            /* no-op */
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set?.({ name, value: "", ...options, maxAge: 0 });
          } catch {
            /* no-op */
          }
        },
      },
    }
  );
}
