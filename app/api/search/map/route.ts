import { NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SearchMapRow = {
  account_type?: string | null;
  type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
} & Record<string, unknown>;

type GenericStringError = { error: true };

type Bounds = {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

type Filters = {
  sport?: string | null;
  clubCategory?: string | null;
  foot?: string | null;
  gender?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
};

function toIlikePattern(value: string) {
  const escaped = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function parseBounds(url: URL): Bounds {
  const toNum = (key: string) => {
    const raw = url.searchParams.get(key);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    north: toNum('north'),
    south: toNum('south'),
    east: toNum('east'),
    west: toNum('west'),
  };
}

function clampLimit(value: number | undefined) {
  if (!value && value !== 0) return 100;
  return Math.min(500, Math.max(10, Math.floor(value)));
}

function parseFilters(url: URL): Filters {
  const cleanText = (key: string) => {
    const raw = url.searchParams.get(key);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };
  const toNumber = (key: string) => {
    const raw = url.searchParams.get(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  return {
    sport: cleanText('sport'),
    clubCategory: cleanText('club_category'),
    foot: cleanText('foot'),
    gender: cleanText('gender'),
    ageMin: toNumber('age_min'),
    ageMax: toNumber('age_max'),
  };
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'search:map', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'all').toLowerCase();
  const bounds = parseBounds(url);
  const limit = clampLimit(Number(url.searchParams.get('limit') || '100'));
  const filters = parseFilters(url);
  const searchQuery = (url.searchParams.get('query') || '').trim();
  const ilikeQuery = searchQuery ? toIlikePattern(searchQuery) : null;
  const requestedUserId = url.searchParams.get('current_user_id');
  const currentYear = new Date().getFullYear();

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const select = [
      'id',
      'user_id',
      'display_name',
      'full_name',
      'account_type',
      'type',
      'status',
      'is_admin',
      'country',
      'region',
      'province',
      'city',
      'avatar_url',
      'sport',
      'role',
      'latitude',
      'longitude',
      'club_stadium_lat',
      'club_stadium_lng',
      'club_league_category',
      'foot',
      'birth_year',
      'gender',
    ].join(',');

    const baseQuery = () =>
      supabase
        .from('profiles')
        .select(select, { count: 'exact' })
        .limit(limit)
        .eq('status', 'active')
        .neq('is_admin', true);

    const applyFilters = (query: ReturnType<typeof baseQuery>) => {
      let filtered = query;

      if (user?.id) {
        filtered = filtered.neq('user_id', user.id).neq('id', user.id);
      }

      if (type === 'club') {
        filtered = filtered.or('account_type.eq.club,type.eq.club');
      }
      if (type === 'player' || type === 'athlete') {
        filtered = filtered.or('account_type.eq.athlete,type.eq.athlete,type.eq.player');
      }

      if (filters.sport) filtered = filtered.ilike('sport', filters.sport);
      if (filters.clubCategory) filtered = filtered.ilike('club_league_category', filters.clubCategory);
      if (filters.foot) filtered = filtered.ilike('foot', filters.foot);
      if (filters.gender) filtered = filtered.eq('gender', filters.gender);

      if (ilikeQuery) {
        filtered = filtered.or(
          [
            `display_name.ilike.${ilikeQuery}`,
            `full_name.ilike.${ilikeQuery}`,
            `city.ilike.${ilikeQuery}`,
            `province.ilike.${ilikeQuery}`,
            `region.ilike.${ilikeQuery}`,
            `country.ilike.${ilikeQuery}`,
            `sport.ilike.${ilikeQuery}`,
            `role.ilike.${ilikeQuery}`,
          ].join(','),
        );
      }

      if (filters.ageMin != null) {
        filtered = filtered.lte('birth_year', currentYear - filters.ageMin);
      }
      if (filters.ageMax != null) {
        filtered = filtered.gte('birth_year', currentYear - filters.ageMax);
      }

      return filtered;
    };

    const { north, south, east, west } = bounds;

    const applyBounds = (
      query: ReturnType<typeof baseQuery>,
      { withBounds }: { withBounds: boolean }
    ) => {
      if (!withBounds) return query;
      let bounded = query;
      if (north != null && south != null) {
        bounded = bounded.gte('latitude', south).lte('latitude', north);
      }
      if (east != null && west != null) {
        bounded = bounded.gte('longitude', west).lte('longitude', east);
      }
      return bounded;
    };

    const runQuery = async ({ withBounds }: { withBounds: boolean }) => {
      const q = applyBounds(applyFilters(baseQuery()), { withBounds });
      return q;
    };

    const firstQuery = await runQuery({ withBounds: true });
    const { data, error, count } = await firstQuery;

    if (error) return jsonError(error.message, 400);

    let rawRows = (Array.isArray(data) ? data : []) as Array<
      SearchMapRow | GenericStringError
    >;
    let total = count ?? rawRows.length;
    let usedFallback = false;

    if ((!rawRows || rawRows.length === 0) && (north != null || south != null || east != null || west != null)) {
      const fallbackQuery = await runQuery({ withBounds: false });
      const fallbackResult = await fallbackQuery;
      if (!fallbackResult.error && Array.isArray(fallbackResult.data)) {
        rawRows = fallbackResult.data as Array<SearchMapRow | GenericStringError>;
        total = fallbackResult.count ?? rawRows.length;
        usedFallback = true;
      }
    }

    const rows = rawRows
      .filter(
        (row): row is SearchMapRow =>
          !!row && typeof row === 'object' && !('error' in row)
      )
      .map((row) => {
        const rawType =
          typeof row.account_type === 'string' && row.account_type.trim()
            ? row.account_type
            : row.type;

        const profileId =
          typeof (row as any)?.id === 'string'
            ? (row as any).id
            : typeof (row as any)?.profile_id === 'string'
              ? (row as any).profile_id
              : null;

        const userId =
          typeof (row as any)?.user_id === 'string'
            ? (row as any).user_id
            : null;

        const normalizedType = (() => {
          if (typeof rawType !== 'string') return undefined;
          const t = rawType.trim().toLowerCase();
          if (t === 'player') return 'athlete';
          if (t === 'club' || t === 'athlete') return t;
          return t;
        })();

        const latitude =
          typeof (row as any)?.latitude === 'number'
            ? (row as any).latitude
            : typeof (row as any)?.club_stadium_lat === 'number'
              ? (row as any).club_stadium_lat
              : null;

        const longitude =
          typeof (row as any)?.longitude === 'number'
            ? (row as any).longitude
            : typeof (row as any)?.club_stadium_lng === 'number'
              ? (row as any).club_stadium_lng
              : null;

        return {
          ...row,
          id: profileId,
          profile_id: profileId,
          user_id: userId,
          type: normalizedType,
          account_type: normalizedType ?? (row as any)?.account_type ?? null,
          latitude,
          longitude,
        } as SearchMapRow;
      })
      .filter((row) => {
        if (!row || !row.id) return false;
        if (user?.id && (row.user_id === user.id || row.id === user.id)) return false;
        if (requestedUserId && (row.user_id === requestedUserId || row.id === requestedUserId)) return false;
        return true;
      });

    return NextResponse.json({ data: rows, total, fallback: usedFallback ? 'no_geocoded_results' : undefined });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Errore ricerca mappa';
    return jsonError(msg, 500);
  }
}