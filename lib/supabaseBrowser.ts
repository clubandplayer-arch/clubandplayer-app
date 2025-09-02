'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client Supabase SOLO per il browser.
 * Persistenza sessione attiva, auto refresh token.
 */
export function supabaseBrowser() {
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
