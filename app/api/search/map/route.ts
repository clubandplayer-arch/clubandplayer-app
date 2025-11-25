import { NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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
  const currentYear = new Date().getFullYear();

  try {
    const supabase = await getSupabaseServerClient();
    const selectBase =
      'id,user_id,display_name,type,country,region,province,city,avatar_url,sport,role,latitude,longitude';
    const selectExtended = `${selectBase},club_league_category,foot,birth_year,gender`;

    const missingOptionalCols = /club_league_category|foot|birth_year|gender|latitude|longitude/i;

    const applyFilters = (query: any, allowOptional: boolean) => {
      if (type === 'club') query = query.eq('type', 'club');
      if (type === 'player' || type === 'athlete') query = query.eq('type', 'athlete');

      if (filters.sport) query = query.ilike('sport', filters.sport);
      if (filters.clubCategory && allowOptional) query = query.ilike('club_league_category', filters.clubCategory);
      if (filters.foot && allowOptional) query = query.ilike('foot', filters.foot);
      if (filters.gender && allowOptional) query = query.eq('gender', filters.gender);

      if (allowOptional && filters.ageMin != null) {
        query = query.lte('birth_year', currentYear - filters.ageMin);
      }
      if (allowOptional && filters.ageMax != null) {
        query = query.gte('birth_year', currentYear - filters.ageMax);
      }
      return query;
    };

    const runQuery = async (select: string, filterByBounds: boolean, allowOptional: boolean) => {
      let query = supabase
        .from('profiles')
        .select(select, { count: 'exact' })
        .limit(limit);

      query = applyFilters(query, allowOptional);

      if (filterByBounds) {
        const { north, south, east, west } = bounds;
        if (north != null && south != null) {
          query = query.gte('latitude', south).lte('latitude', north);
        }
        if (east != null && west != null) {
          query = query.gte('longitude', west).lte('longitude', east);
        }
      }

      return query; // caller executes
    };

    let { data, error, count } = await (await runQuery(selectExtended, true, true));

    if (error && missingOptionalCols.test(error.message || '')) {
      ({ data, error, count } = await (await runQuery(selectBase, true, false)));
    }
    if (error && /column .*latitude.* does not exist/i.test(error.message || '')) {
      ({ data, error, count } = await (await runQuery(selectBase.replace(',latitude,longitude', ''), false, false)));
    }

    if (error) return jsonError(error.message, 400);

    const rows = Array.isArray(data) ? data : [];
    return NextResponse.json({ data: rows, total: count ?? rows.length });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Errore ricerca mappa';
    return jsonError(msg, 500);
  }
}
