import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin'

export type PublicProfileSummary = {
  id: string
  display_name: string | null
  full_name: string | null
  headline: string | null
  bio: string | null
  sport: string | null
  role: string | null
  country: string | null
  region: string | null
  province: string | null
  city: string | null
  avatar_url: string | null
  account_type: string | null
}

const SELECT_COLUMNS = [
  'id',
  'user_id',
  'display_name',
  'full_name',
  'headline',
  'bio',
  'sport',
  'role',
  'country',
  'region',
  'province',
  'city',
  'avatar_url',
  'account_type',
  'profile_type',
  'type',
].join(',')

type AnySupabase = SupabaseClient<any, any, any>

type FetchOptions = {
  fallbackToAdmin?: boolean
}

function normalize(row: any): PublicProfileSummary {
  return {
    id: row.id as string,
    display_name: row.display_name ?? null,
    full_name: row.full_name ?? null,
    headline: row.headline ?? null,
    bio: row.bio ?? null,
    sport: row.sport ?? null,
    role: row.role ?? null,
    country: row.country ?? null,
    region: row.region ?? null,
    province: row.province ?? null,
    city: row.city ?? null,
    avatar_url: row.avatar_url ?? null,
    account_type: row.account_type ?? row.profile_type ?? row.type ?? null,
  }
}

async function fetchWithClient(
  client: AnySupabase,
  column: 'id' | 'user_id',
  values: string[],
): Promise<{ rows: any[]; error: any | null }> {
  if (!values.length) return { rows: [], error: null }
  const { data, error } = await client
    .from('profiles')
    .select(SELECT_COLUMNS)
    .in(column, values)
  return { rows: data ?? [], error: error ?? null }
}

export async function fetchPublicProfilesByIds(
  ids: string[],
  supabase: AnySupabase,
  opts: FetchOptions = {},
): Promise<Map<string, PublicProfileSummary>> {
  const unique = Array.from(new Set(ids.map(id => String(id ?? '').trim()).filter(Boolean)))
  const result = new Map<string, PublicProfileSummary>()
  if (!unique.length) return result

  let { rows, error } = await fetchWithClient(supabase, 'id', unique)

  const needsFallback = opts.fallbackToAdmin && ((error != null) || rows.length === 0)
  if (needsFallback) {
    const admin = getSupabaseAdminClientOrNull()
    if (admin) {
      const fallback = await fetchWithClient(admin, 'id', unique)
      if (fallback.error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[profiles] fallback admin error:', fallback.error)
        }
      } else {
        rows = fallback.rows
        error = null
      }
    } else if (process.env.NODE_ENV !== 'production' && error) {
      console.warn('[profiles] admin fallback non disponibile:', error)
    }
  }

  if (error) throw error

  rows.forEach(row => {
    if (row && row.id) {
      result.set(String(row.id), normalize(row))
    }
  })

  return result
}

export async function fetchPublicProfileById(
  id: string,
  supabase: AnySupabase,
  opts: FetchOptions = {},
): Promise<PublicProfileSummary | null> {
  if (!id) return null
  const map = await fetchPublicProfilesByIds([id], supabase, opts)
  const direct = map.get(String(id))
  if (direct) return direct

  // Fallback legacy: alcuni profili potrebbero avere l'user_id come PK logica
  const unique = Array.from(new Set([String(id ?? '').trim()].filter(Boolean)))
  if (!unique.length) return null

  const { rows, error } = await fetchWithClient(supabase, 'user_id', unique)
  let finalRows = rows
  let finalError = error

  if ((finalError || finalRows.length === 0) && opts.fallbackToAdmin) {
    const admin = getSupabaseAdminClientOrNull()
    if (admin) {
      const fb = await fetchWithClient(admin, 'user_id', unique)
      if (!fb.error) {
        finalRows = fb.rows
        finalError = null
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('[profiles] fallback admin user_id error:', fb.error)
      }
    }
  }

  if (finalError) throw finalError
  if (!finalRows.length) return null
  const row = finalRows.find(r => r?.id) ?? finalRows[0]
  return normalize(row)
}
