import { supabaseBrowser } from '@/lib/supabaseBrowser'

export type ClubRow = { id: string; display_name: string | null; city: string | null }
export type AthleteRow = { id: string; full_name: string | null; sport: string | null; role: string | null; city: string | null }

export async function getClubs(params?: { city?: string; limit?: number; offset?: number }) {
  const sb = supabaseBrowser()
  let q = sb.from('profiles')
    .select('id, full_name, city')
    .eq('account_type', 'club')
    .order('full_name', { ascending: true, nullsFirst: false })

  if (params?.city) q = q.eq('city', params.city)

  // paginazione (range è inclusivo)
  const limit = params?.limit ?? 50
  const from = params?.offset ?? 0
  const to = from + limit - 1
  const { data, error } = await q.range(from, to)

  if (error) throw error
  const rows = (data ?? []).map(r => ({
    id: (r as any).id as string,
    display_name: (r as any).full_name as string | null,
    city: (r as any).city as string | null
  })) as ClubRow[]
  return rows
}

export async function getAthletes(params?: {
  sport?: string; role?: string; city?: string; limit?: number; offset?: number
}) {
  const sb = supabaseBrowser()
  let q = sb.from('profiles')
    .select('id, full_name, sport, role, city')
    .eq('account_type', 'athlete')
    .order('full_name', { ascending: true, nullsFirst: false })

  if (params?.sport) q = q.eq('sport', params.sport)
  if (params?.role) q = q.eq('role', params.role)
  if (params?.city) q = q.eq('city', params.city)

  const limit = params?.limit ?? 50
  const from = params?.offset ?? 0
  const to = from + limit - 1
  const { data, error } = await q.range(from, to)

  if (error) throw error
  return (data ?? []) as AthleteRow[]
}
