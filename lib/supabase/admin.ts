// lib/supabase/admin.ts
// Client ADMIN server-side (usa la Service Role Key). NON usare mai lato client.

import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY

function createAdminClient() {
  if (!SUPA_URL || !SERVICE_ROLE) {
    throw new Error(
      'Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY',
    )
  }
  return createClient(SUPA_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'api-bypass-admin' } },
  })
}

export function getSupabaseAdminClient() {
  return createAdminClient()
}

export function getSupabaseAdminClientOrNull() {
  try {
    return createAdminClient()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[supabase-admin] impossibile creare client admin:', err)
    }
    return null
  }
}

export async function ensureBucket(name: string, isPublic = true) {
  const client = getSupabaseAdminClient()
  const { data: buckets, error: listErr } = await client.storage.listBuckets()
  if (listErr) throw listErr
  if (!buckets?.some((b: any) => b.name === name)) {
    const { error: createErr } = await client.storage.createBucket(name, { public: isPublic })
    if (createErr) throw createErr
  }
  return client
}
