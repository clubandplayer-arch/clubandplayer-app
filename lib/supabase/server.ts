// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
<<<<<<< HEAD
 * Fallback robusto: usa prima le env "server" (SUPABASE_*),
 * altrimenti le "public" (NEXT_PUBLIC_*).
 */
function resolveEnv() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) {
    throw new Error('Supabase env missing: set SUPABASE_URL/ANON_KEY or NEXT_PUBLIC_*');
  }
  return { url, anon };
}

/**
 * Next.js 15: cookies() è async → attendiamo e passiamo un adapter.
 * Uso: const supabase = await getSupabaseServerClient();
 */
export async function getSupabaseServerClient() {
  const { url, anon } = resolveEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
=======
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
>>>>>>> codex/verify-repository-correctness
      },
      set(name: string, value: string, options?: any) {
        cookieStore.set({ name, value, ...(options ?? {}) });
      },
      remove(name: string, options?: any) {
        cookieStore.set({ name, value: '', ...(options ?? {}), maxAge: 0 });
      },
    },
    cookieOptions: { sameSite: 'lax' },
  });

  return supabase;
}
