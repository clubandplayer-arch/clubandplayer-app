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

  try {
    const supabase = await getSupabaseServerClient();
    const selectBase =
      'id,user_id,display_name,type,country,region,province,city,avatar_url,sport,role,latitude,longitude';

    const runQuery = async (select: string, filterByBounds: boolean) => {
      let query = supabase
        .from('profiles')
        .select(select, { count: 'exact' })
        .limit(limit);

      if (type === 'club') query = query.eq('type', 'club');
      if (type === 'player' || type === 'athlete') query = query.eq('type', 'athlete');

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

    // Primo tentativo con lat/long
    let { data, error, count } = await (await runQuery(selectBase, true));

    // Se colonne non esistono, riprova senza vincolo geografico
    if (error && /column .*latitude.* does not exist/i.test(error.message || '')) {
      ({ data, error, count } = await (await runQuery('id,user_id,display_name,type,country,region,province,city,avatar_url,sport,role', false)));
    }

    if (error) return jsonError(error.message, 400);

    const rows = Array.isArray(data) ? data : [];
    return NextResponse.json({ data: rows, total: count ?? rows.length });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Errore ricerca mappa';
    return jsonError(msg, 500);
  }
}
