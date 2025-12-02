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
  account_type?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get('limit'));
  const limit = clamp(Number.isFinite(rawLimit) ? rawLimit : 3, 1, 20);

  try {
    const supabase = await getSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) {
      return NextResponse.json({ items: [], role: 'guest' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, status, country, city, interest_country, interest_city')
      .eq('user_id', userRes.user.id)
      .maybeSingle();

    const role =
      (profile?.account_type === 'athlete' || profile?.account_type === 'club'
        ? profile.account_type
        : 'guest') || 'guest';

    if (!profile?.id || profile.status !== 'active') {
      return NextResponse.json({ items: [], role });
    }

    const profileId = profile.id;

    const targetProfileType: Role = role === 'club' ? 'athlete' : 'club';
    const viewerCountry = (profile?.interest_country || profile?.country || '').trim();

    const { data: existing } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', profileId)
      .limit(200);

    const alreadyFollowing = new Set(
      (existing || [])
        .map((row) => (row as any)?.target_profile_id)
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
        const values = Array.from(alreadyFollowing)
          .map((id) => `'${id}'`)
          .join(',');
        query = query.not('id', 'in', `(${values})`);
      }

      query = query.order('followers_count', { ascending: false }).limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    const rows: any[] = await runQuery(
      viewerCountry ? [(q) => q.eq('country', viewerCountry)] : [],
    );

    const items: Suggestion[] = rows.map((p) => ({
      id: p.id,
      name: (p.full_name || p.display_name || 'Profilo').toString(),
      city: p.city || null,
      country: p.country || null,
      role: p.role || null,
      sport: p.sport || null,
      avatar_url: p.avatar_url || null,
      followers: p.followers_count ?? null,
      account_type: p.account_type || targetProfileType,
    } as any));

    return NextResponse.json({
      items,
      nextCursor: null,
      role,
    });
  } catch (err) {
    console.error('[follows/suggestions] error', err);
    return NextResponse.json({ items: [], role: 'guest' });
  }
}
