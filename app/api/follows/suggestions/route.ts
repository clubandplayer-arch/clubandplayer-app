// app/api/follows/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'athlete' | 'club' | 'guest';

type Suggestion = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  followers?: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = clamp(Number(url.searchParams.get('limit') || '3') || 3, 1, 6);

  try {
    const supabase = await getSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) {
      return NextResponse.json({ items: [], role: 'guest', targetType: 'club' });
    }

    const userId = userRes.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, status, country, city, interest_country, interest_city')
      .eq('user_id', userId)
      .maybeSingle();

    const role =
      (profile?.account_type === 'athlete' || profile?.account_type === 'club'
        ? profile.account_type
        : 'guest') || 'guest';

    const targetProfileType: Role = role === 'club' ? 'athlete' : 'club';
    const followTargetTypes = targetProfileType === 'athlete' ? ['player', 'athlete'] : ['club'];
    const viewerCountry = (profile?.interest_country || profile?.country || '').trim();
    const viewerCity = (profile?.interest_city || profile?.city || '').trim();

    const { data: existing } = await supabase
      .from('follows')
      .select('target_id, target_type')
      .eq('follower_id', userId)
      .in('target_type', followTargetTypes)
      .limit(200);

    const alreadyFollowing = new Set(
      (existing || [])
        .map((row) => (row as any)?.target_id)
        .filter(Boolean)
        .map((id) => id.toString()),
    );

    const baseSelect =
      'id, account_type, full_name, display_name, role, city, country, sport, avatar_url, followers_count, status';

    async function runQuery(filters: Array<(q: any) => any>) {
      let query = supabase
        .from('profiles')
        .select(baseSelect)
        .eq('account_type', targetProfileType)
        .eq('status', 'active')
        .neq('id', profile?.id ?? '');

      filters.forEach((fn) => {
        query = fn(query);
      });

      if (alreadyFollowing.size) {
        query = query.not('id', 'in', `(${Array.from(alreadyFollowing).join(',')})`);
      }

      query = query.order('followers_count', { ascending: false }).limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    let rows: any[] = [];

    if (viewerCountry && viewerCity) {
      rows = await runQuery([
        (q) => q.eq('country', viewerCountry).eq('city', viewerCity),
      ]);
    }

    if (!rows.length && viewerCountry) {
      rows = await runQuery([(q) => q.eq('country', viewerCountry)]);
    }

    if (!rows.length) {
      rows = await runQuery([]);
    }

    const items: Suggestion[] = rows.map((p) => ({
      id: p.id,
      name: (p.full_name || p.display_name || 'Profilo').toString(),
      city: p.city || null,
      country: p.country || null,
      role: p.role || null,
      sport: p.sport || null,
      avatar_url: p.avatar_url || null,
      followers: p.followers_count ?? null,
    }));

    return NextResponse.json({
      items,
      nextCursor: null,
      role,
      targetType: targetProfileType,
    });
  } catch (err) {
    console.error('[follows/suggestions] error', err);
    return NextResponse.json({ items: [], role: 'guest', targetType: 'club' });
  }
}
