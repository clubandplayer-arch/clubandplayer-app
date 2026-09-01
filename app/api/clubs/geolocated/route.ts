import type { NextRequest } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimit';
import { dbError, invalidPayload, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { buildProfileDisplayName } from '@/lib/displayName';
import { resolvePublicMapPoint, MapGeographyContractError } from '@/lib/maps/geographyContract';
import { applyOrganizationMapBounds, applyOrganizationMapLocationScope, resolveCanonicalMapLocationScope, resolveMapViewportFromParams, SupabaseMapViewportCatalog } from '@/lib/maps/geography.server';
import { mapResultWindow, PUBLIC_MAP_LIMITS } from '@/lib/maps/publicMapPolicy';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'clubs:geolocated', limit: 120, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  try {
    const supabase = await getSupabaseServerClient();
    let query = applyPublicProfileVisibilityFilters(
      supabase.from('profiles').select('id, display_name, full_name, avatar_url, account_type, type, status, is_admin, city, province, region, club_stadium_lat, club_stadium_lng, latitude, longitude'),
    )
      .neq('is_admin', true)
      .or('account_type.eq.club,type.eq.club');

    let viewport = null;
    let locationScope = null;
    try {
      viewport = await resolveMapViewportFromParams(req.nextUrl.searchParams, new SupabaseMapViewportCatalog(supabase));
    } catch (error) {
      if (!(error instanceof MapGeographyContractError) || error.code !== 'VIEWPORT_BOUNDS_UNAVAILABLE') throw error;
      locationScope = await resolveCanonicalMapLocationScope(req.nextUrl.searchParams, supabase);
    }
    if (viewport) query = applyOrganizationMapBounds(query, viewport.bounds);
    if (locationScope) query = applyOrganizationMapLocationScope(query, locationScope);
    const resultLimit = viewport || locationScope ? PUBLIC_MAP_LIMITS.boundedClubs : PUBLIC_MAP_LIMITS.globalClubs;
    const { data, error } = await query.limit(resultLimit + 1);

    if (error) return dbError(error.message);

    const resolvedRows = (data ?? [])
      .map((row: any) => {
        let coordinates = null;
        try {
          coordinates = resolvePublicMapPoint({
            accountType: row.account_type ?? row.type,
            venue: { latitude: row.club_stadium_lat, longitude: row.club_stadium_lng },
            legacyProfile: { latitude: row.latitude, longitude: row.longitude },
          });
        } catch {
          // Corrupt or partial public coordinate pairs fail closed per row.
        }
        const name = buildProfileDisplayName(row.full_name, row.display_name, 'Club');

        return {
          id: typeof row.id === 'string' ? row.id : '',
          name,
          avatar_url: typeof row.avatar_url === 'string' && row.avatar_url.trim() ? row.avatar_url : null,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          coordinate_source: coordinates?.source ?? null,
          city: typeof row.city === 'string' && row.city.trim() ? row.city : null,
          province: typeof row.province === 'string' && row.province.trim() ? row.province : null,
          region: typeof row.region === 'string' && row.region.trim() ? row.region : null,
        };
      })
      .filter((row) => row.id && row.latitude != null && row.longitude != null);
    const { rows, truncated } = mapResultWindow(resolvedRows, resultLimit);

    return successResponse({
      data: rows,
      viewport: viewport ? {
        source: viewport.source,
        countryId: viewport.countryId,
        geoAreaId: viewport.geoAreaId,
        bounds: viewport.bounds,
      } : locationScope ? {
        source: locationScope.source,
        countryId: locationScope.countryId,
        geoAreaId: locationScope.geoAreaId,
        bounds: null,
      } : null,
      meta: { limit: resultLimit, returned: rows.length, truncated },
    });
  } catch (err: any) {
    if (err instanceof MapGeographyContractError) return invalidPayload(err.message, { reason: err.code });
    return unknownError({ endpoint: 'clubs/geolocated', error: err });
  }
}
