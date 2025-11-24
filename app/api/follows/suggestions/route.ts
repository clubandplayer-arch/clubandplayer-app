// app/api/follows/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'athlete' | 'club' | 'guest';

type Suggestion = {
  id: string;
  name: string;
  handle?: string | null;
  city?: string | null;
  sport?: string | null;
  avatar_url?: string | null;
  followers?: number | null;
};

const FALLBACK_CLUBS: Suggestion[] = [
  {
    id: 'club-mock-1',
    name: 'ASD Club Atlético Carlentini',
    handle: 'clubatleticocarlentini',
    city: 'Carlentini (SR)',
    sport: 'Calcio',
    followers: 3120,
  },
];

const FALLBACK_ATHLETES: Suggestion[] = [
  {
    id: 'athlete-mock-1',
    name: 'Marco Greco',
    handle: 'marco.greco9',
    city: 'Catania',
    sport: 'Calcio (ATT)',
    followers: 420,
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const forRole = (url.searchParams.get('for') ||
    'guest') as Role;

  const limit = clamp(
    Number(url.searchParams.get('limit') || '4') || 4,
    1,
    8
  );
  const cursor =
    Number(url.searchParams.get('cursor') || '0') || 0;

  try {
    const supabase = await getSupabaseServerClient();

    // atleta → suggerisci club; club/guest → suggerisci atleti
    const targetType =
      forRole === 'club' ? 'athlete' : 'club';

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, account_type, full_name, display_name, city, sport, avatar_url, followers_count'
      )
      .eq('account_type', targetType)
      .order('followers_count', { ascending: false })
      .range(cursor, cursor + limit - 1);

    if (!error && data && data.length > 0) {
      const items: Suggestion[] = data.map((p) => ({
        id: p.id,
        name:
          (p.full_name || p.display_name || '').trim() ||
          'Profilo',
        city: p.city || null,
        sport: p.sport || null,
        avatar_url: p.avatar_url || null,
        followers: p.followers_count ?? null,
      }));

      const nextCursor =
        data.length === limit
          ? String(cursor + limit)
          : null;

      return NextResponse.json({ items, nextCursor });
    }

    if (error) {
      console.warn(
        '[follows/suggestions] supabase error, fallback',
        error.message
      );
    }
  } catch (err) {
    console.error(
      '[follows/suggestions] fatal supabase error, fallback',
      err
    );
  }

  // Fallback mock
  const source =
    forRole === 'club'
      ? FALLBACK_ATHLETES
      : FALLBACK_CLUBS;

  const sorted = [...source].sort(
    (a, b) => (b.followers || 0) - (a.followers || 0)
  );
  const slice = sorted.slice(
    cursor,
    cursor + limit
  );
  const nextCursor =
    cursor + limit < sorted.length
      ? String(cursor + limit)
      : null;

  return NextResponse.json({ items: slice, nextCursor });
}
