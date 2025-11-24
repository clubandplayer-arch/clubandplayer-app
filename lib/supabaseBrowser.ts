'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

/** Client Supabase SOLO per il browser, memoizzato per evitare re-render continui. */
export function supabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}
