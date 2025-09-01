// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Nessun import di `Database` per sbloccare il build.

export function createSupabaseServerClient() {
  const cookieStore = cookies(); // in runtime Node è sync; ok anche se altrove usi await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // implementa se vuoi scrivere cookie lato server
        },
        remove() {
          // implementa se vuoi rimuovere cookie lato server
        },
      },
    }
  );
}

// 🔙 Back-compat: mantieni il vecchio nome usato dalle route
export const getSupabaseServerClient = createSupabaseServerClient;

// (opzionale) default export per import flessibili
export default createSupabaseServerClient;
