import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Next.js 15: cookies() è ASYNC → qui lo attendiamo e
 * ritorniamo un client pronto. Nei chiamanti:
 *   const supabase = await getSupabaseServerClient();
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies(); // differenza chiave in Next 15

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options?: any) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  return supabase;
}
