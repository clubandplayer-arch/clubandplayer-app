import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resolveEnv(key: "URL" | "ANON_KEY") {
  const envKey = key === "URL" ? "SUPABASE_URL" : "SUPABASE_ANON_KEY";
  const publicKey = key === "URL" ? "NEXT_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_ANON_KEY";

  const direct = process.env[envKey];
  if (direct) return direct;
  const nextPublic = process.env[publicKey];
  if (nextPublic) return nextPublic;
  throw new Error(`Missing Supabase environment variable ${envKey}`);
}

/**
 * Next.js 15: cookies() è async → qui lo attendiamo e
 * ritorniamo un client pronto. Nei chiamanti:
 *   const supabase = await getSupabaseServerClient();
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    resolveEnv("URL"),
    resolveEnv("ANON_KEY"),
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
