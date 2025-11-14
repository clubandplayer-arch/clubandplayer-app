// lib/supabase/admin.ts
// Client ADMIN server-side (usa la Service Role Key). NON usare mai lato client.

import { createClient } from '@supabase/supabase-js'

const SUPA_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getSupabaseAdminClient() {
  if (!SUPA_URL || !SERVICE_ROLE) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(SUPA_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'api-bypass-admin' } },
  })
}
