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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const select = [
      'id',
      'user_id',
      'display_name',
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
      'club_league_category',
      'foot',
      'birth_year',
      'gender',
    ].join(',');

    let query = supabase
      .from('profiles')
      .select(select, { count: 'exact' })
      .limit(limit)
      .eq('status', 'active')
      .neq('is_admin', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (user?.id) {
      query = query.neq('user_id', user.id).neq('id', user.id);
    }

    if (type === 'club') {
      query = query.or('account_type.eq.club,type.eq.club');
    }
    if (type === 'player' || type === 'athlete') {
      query = query.or('account_type.eq.athlete,type.eq.athlete');
    }

    if (filters.sport) query = query.ilike('sport', filters.sport);
    if (filters.clubCategory) query = query.ilike('club_league_category', filters.clubCategory);
    if (filters.foot) query = query.ilike('foot', filters.foot);
    if (filters.gender) query = query.eq('gender', filters.gender);

    if (filters.ageMin != null) {
      query = query.lte('birth_year', currentYear - filters.ageMin);
    }
    if (filters.ageMax != null) {
      query = query.gte('birth_year', currentYear - filters.ageMax);
    }

    const { north, south, east, west } = bounds;
    if (north != null && south != null) {
      query = query.gte('latitude', south).lte('latitude', north);
    }
    if (east != null && west != null) {
      query = query.gte('longitude', west).lte('longitude', east);
    }

    const { data, error, count } = await query;

    if (error) return jsonError(error.message, 400);

    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      type:
        typeof row.account_type === 'string' && row.account_type.trim()
          ? row.account_type
          : row.type,
    }));

    return NextResponse.json({ data: rows, total: count ?? rows.length });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Errore ricerca mappa';
    return jsonError(msg, 500);
  }
}
