import type { NextRequest } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimit';
import { dbError, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { buildProfileDisplayName } from '@/lib/displayName';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type CoordinatePair = {
  latitude: number;
  longitude: number;
  source: 'stadium' | 'profile' | 'city';
};

const CITY_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  carlentini: { latitude: 37.2754, longitude: 15.0129 },
  lentini: { latitude: 37.2865, longitude: 14.9992 },
  roma: { latitude: 41.9028, longitude: 12.4964 },
  'roma capitale': { latitude: 41.9028, longitude: 12.4964 },
  rome: { latitude: 41.9028, longitude: 12.4964 },
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toCleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeLocationKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stableOffset(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.012 + ((hash % 7) * 0.002);
  return {
    latitude: Math.sin(angle) * radius,
    longitude: Math.cos(angle) * radius,
  };
}

function pickCityCoordinatePair(row: Record<string, unknown>): CoordinatePair | null {
  const city = toCleanString(row.city) ?? toCleanString(row.interest_city);
  if (!city) return null;

  const centroid = CITY_CENTROIDS[normalizeLocationKey(city)];
  if (!centroid) return null;

  const profileSeed = [row.id, row.display_name, row.full_name, city].filter(Boolean).join(':');
  const offset = stableOffset(profileSeed);
  return {
    latitude: centroid.latitude + offset.latitude,
    longitude: centroid.longitude + offset.longitude,
    source: 'city',
  };
}

function pickCoordinatePair(row: Record<string, unknown>): CoordinatePair | null {
  const stadiumLatitude = toNumber(row.club_stadium_lat);
  const stadiumLongitude = toNumber(row.club_stadium_lng);
  if (stadiumLatitude != null && stadiumLongitude != null) {
    return { latitude: stadiumLatitude, longitude: stadiumLongitude, source: 'stadium' };
  }

  const profileLatitude = toNumber(row.latitude);
  const profileLongitude = toNumber(row.longitude);
  if (profileLatitude != null && profileLongitude != null) {
    return { latitude: profileLatitude, longitude: profileLongitude, source: 'profile' };
  }

  return pickCityCoordinatePair(row);
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
      .select('id, display_name, full_name, avatar_url, account_type, type, status, is_admin, city, province, region, interest_city, interest_province, interest_region, club_stadium_lat, club_stadium_lng, latitude, longitude')
      .eq('status', 'active')
      .or('is_admin.is.null,is_admin.eq.false')
      .or('account_type.eq.club,type.eq.club')
      .limit(1000);

    if (error) return dbError(error.message);

    const rows = (data ?? [])
      .map((row: any) => {
        const coordinates = pickCoordinatePair(row);
        const name = buildProfileDisplayName(row.full_name, row.display_name, 'Club');

        return {
          id: typeof row.id === 'string' ? row.id : '',
          name,
          avatar_url: typeof row.avatar_url === 'string' && row.avatar_url.trim() ? row.avatar_url : null,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          coordinate_source: coordinates?.source ?? null,
          city: toCleanString(row.city) ?? toCleanString(row.interest_city),
          province: toCleanString(row.province) ?? toCleanString(row.interest_province),
          region: toCleanString(row.region) ?? toCleanString(row.interest_region),
        };
      })
      .filter((row) => row.id && row.latitude != null && row.longitude != null);

    return successResponse({ data: rows });
  } catch (err: any) {
    return unknownError({ endpoint: 'clubs/geolocated', error: err });
  }
}
