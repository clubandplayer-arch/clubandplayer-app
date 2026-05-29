import type { NextRequest } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimit';
import { dbError, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { buildProfileDisplayName } from '@/lib/displayName';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'clubs:geolocated', limit: 120, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, account_type, type, status, is_admin, city, province, region, club_stadium_lat, club_stadium_lng, latitude, longitude')
      .eq('status', 'active')
      .neq('is_admin', true)
      .or('account_type.eq.club,type.eq.club')
      .limit(1000);

    if (error) return dbError(error.message);

    const rows = (data ?? [])
      .map((row: any) => {
        const latitude = toNumber(row.club_stadium_lat) ?? toNumber(row.latitude);
        const longitude = toNumber(row.club_stadium_lng) ?? toNumber(row.longitude);
        const name = buildProfileDisplayName(row.full_name, row.display_name, 'Club');

        return {
          id: typeof row.id === 'string' ? row.id : '',
          name,
          avatar_url: typeof row.avatar_url === 'string' && row.avatar_url.trim() ? row.avatar_url : null,
          latitude,
          longitude,
          city: typeof row.city === 'string' && row.city.trim() ? row.city : null,
          province: typeof row.province === 'string' && row.province.trim() ? row.province : null,
          region: typeof row.region === 'string' && row.region.trim() ? row.region : null,
        };
      })
      .filter((row) => row.id && row.latitude != null && row.longitude != null);

    return successResponse({ data: rows });
  } catch (err: any) {
    return unknownError({ endpoint: 'clubs/geolocated', error: err });
  }
}
