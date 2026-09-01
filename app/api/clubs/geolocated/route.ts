import type { NextRequest } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimit';
import { dbError, invalidPayload, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { buildProfileDisplayName } from '@/lib/displayName';
import { resolvePublicMapPoint, MapGeographyContractError } from '@/lib/maps/geographyContract';
import { applyOrganizationMapBounds, resolveMapViewportFromParams, SupabaseMapViewportCatalog } from '@/lib/maps/geography.server';
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

    const viewport = await resolveMapViewportFromParams(req.nextUrl.searchParams, new SupabaseMapViewportCatalog(supabase));
    if (viewport) query = applyOrganizationMapBounds(query, viewport.bounds);
    const { data, error } = await query.limit(viewport ? 500 : 1000);

    if (error) return dbError(error.message);

    const rows = (data ?? [])
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

    return successResponse({
      data: rows,
      viewport: viewport ? {
        source: viewport.source,
        countryId: viewport.countryId,
        geoAreaId: viewport.geoAreaId,
        bounds: viewport.bounds,
      } : null,
    });
  } catch (err: any) {
    if (err instanceof MapGeographyContractError) return invalidPayload(err.message, { reason: err.code });
    return unknownError({ endpoint: 'clubs/geolocated', error: err });
  }
}
