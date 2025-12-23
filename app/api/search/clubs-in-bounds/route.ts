import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/api/rateLimit'
import { rateLimited, dbError, successResponse, unknownError } from '@/lib/api/standardResponses'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function parseNumber(val: string | null): number | null {
  if (!val) return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'search:clubs-bounds', limit: 120, window: '1m' } as any)
  } catch {
    return rateLimited('Too Many Requests')
  }

  const url = new URL(req.url)
  const north = parseNumber(url.searchParams.get('north'))
  const south = parseNumber(url.searchParams.get('south'))
  const east = parseNumber(url.searchParams.get('east'))
  const west = parseNumber(url.searchParams.get('west'))

  if (north == null || south == null || east == null || west == null) {
    return successResponse({ data: [] })
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, latitude, longitude, club_stadium_lat, club_stadium_lng')
      .eq('status', 'active')
      .neq('is_admin', true)
      .or('account_type.eq.club,type.eq.club')
      .gte('latitude', south)
      .lte('latitude', north)
      .gte('longitude', west)
      .lte('longitude', east)
      .limit(200)

    if (error) return dbError(error.message)

    const rows = (data ?? [])
      .map((row: any) => {
        const lat = typeof row.latitude === 'number' ? row.latitude : row.club_stadium_lat ?? null
        const lng = typeof row.longitude === 'number' ? row.longitude : row.club_stadium_lng ?? null
        return {
          id: row.id,
          display_name: row.display_name ?? null,
          full_name: row.full_name ?? null,
          latitude: lat,
          longitude: lng,
        }
      })
      .filter((r) => r.id && r.latitude != null && r.longitude != null)

    return successResponse({ data: rows })
  } catch (err: any) {
    return unknownError({ endpoint: 'search/clubs-in-bounds', error: err })
  }
}
