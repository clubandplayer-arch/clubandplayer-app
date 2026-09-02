import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/api/rateLimit'
import { rateLimited, dbError, invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility'
import { MapGeographyContractError, resolvePublicMapPoint } from '@/lib/maps/geographyContract'
import { applyOrganizationMapBounds, resolveMapViewportFromParams, SupabaseMapViewportCatalog } from '@/lib/maps/geography.server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'search:clubs-bounds', limit: 120, window: '1m' } as any)
  } catch {
    return rateLimited('Too Many Requests')
  }

  try {
    const supabase = await getSupabaseServerClient()
    const viewport = await resolveMapViewportFromParams(req.nextUrl.searchParams, new SupabaseMapViewportCatalog(supabase))
    if (!viewport) return invalidPayload('map viewport is required', { reason: 'BOUNDS_INCOMPLETE' })
    const query = applyOrganizationMapBounds(applyPublicProfileVisibilityFilters(
      supabase.from('profiles').select('id, display_name, full_name, account_type, type, latitude, longitude, club_stadium_lat, club_stadium_lng'),
    )
      .neq('is_admin', true)
      .or('account_type.eq.club,type.eq.club'), viewport.bounds)
    const { data, error } = await query.limit(200)

    if (error) return dbError(error.message)

    const rows = (data ?? [])
      .map((row: any) => {
        let point = null
        try {
          point = resolvePublicMapPoint({
            accountType: row.account_type ?? row.type,
            venue: { latitude: row.club_stadium_lat, longitude: row.club_stadium_lng },
            legacyProfile: { latitude: row.latitude, longitude: row.longitude },
          })
        } catch {
          // Invalid rows are not public map points.
        }
        return {
          id: row.id,
          display_name: row.display_name ?? null,
          full_name: row.full_name ?? null,
          latitude: point?.latitude ?? null,
          longitude: point?.longitude ?? null,
          coordinate_source: point?.source ?? null,
        }
      })
      .filter((r) => r.id && r.latitude != null && r.longitude != null)

    return successResponse({ data: rows, viewport: {
      source: viewport.source,
      countryId: viewport.countryId,
      geoAreaId: viewport.geoAreaId,
      bounds: viewport.bounds,
    } })
  } catch (err: any) {
    if (err instanceof MapGeographyContractError) return invalidPayload(err.message, { reason: err.code })
    return unknownError({ endpoint: 'search/clubs-in-bounds', error: err })
  }
}
