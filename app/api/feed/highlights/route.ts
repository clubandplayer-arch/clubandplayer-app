import { NextResponse } from 'next/server';
import { getLatestOpenOpportunitiesByClub } from '@/lib/data/opportunities';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function hydrateClubNames(ids: string[], supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  if (!ids.length) return {} as Record<string, string>;

  const { data } = await supabase
    .from('profiles')
    .select('id,user_id,display_name,full_name')
    .in('id', ids);

  return (data || []).reduce((acc, row) => {
    const name = row.full_name || row.display_name;
    if (name) {
      acc[row.id] = name;
      if (row.user_id) acc[row.user_id] = name;
    }
    return acc;
  }, {} as Record<string, string>);
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return NextResponse.json({ items: [], role: 'guest', profileId: null });
  }

  const userId = userRes.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, account_type, status, country, city, interest_country, interest_city, display_name, full_name, sport'
    )
    .eq('user_id', userId)
    .maybeSingle();

  const role =
    (profile?.account_type === 'club' || profile?.account_type === 'athlete'
      ? profile.account_type
      : 'guest') || 'guest';

  const profileId = profile?.id ?? null;
  const profileName = profile?.full_name || profile?.display_name || null;
  const country = (profile?.interest_country || profile?.country || '').trim();
  const city = (profile?.interest_city || profile?.city || '').trim();
  const sport = (profile?.sport || '').trim();

  const baseSelect =
    'id,title,description,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name,gender,club_id,owner_id,created_by,status';

  if (role === 'club') {
    const latest = await getLatestOpenOpportunitiesByClub(profileId, 3);
    const items = latest.map((row) => ({
      ...row,
      club_name: row.club_name || row.clubName || profileName,
    }));

    const viewAllHref = profileId ? `/opportunities?clubId=${profileId}` : '/opportunities';
    return NextResponse.json({ items, role, profileId, viewAllHref });
  }

  // athlete o guest: suggerisci opportunità con fallback progressivo fino a 3 risultati
  const attemptFilters = [
    { sport: sport || null, country: country || null, city: city || null },
    { sport: sport || null, country: country || null, city: null },
    { sport: sport || null, country: null, city: null },
    { sport: null, country: null, city: null },
  ];

  const collected = new Map<string, any>();
  let lastError: string | null = null;

  for (const attempt of attemptFilters) {
    let query = supabase
      .from('opportunities')
      .select(baseSelect)
      .order('created_at', { ascending: false })
      .limit(10)
      .or('status.eq.aperto,status.is.null');

    if (attempt.sport) query = query.eq('sport', attempt.sport);
    if (attempt.country) query = query.eq('country', attempt.country);
    if (attempt.city) query = query.eq('city', attempt.city);

    const { data, error } = await query;
    if (error) {
      lastError = error.message;
      continue;
    }

    for (const row of data || []) {
      if (!collected.has(row.id)) {
        collected.set(row.id, row);
      }
    }

    if (collected.size >= 3) break;
  }

  if (!collected.size && lastError) {
    return NextResponse.json({ items: [], role, profileId, error: lastError });
  }

  const results = Array.from(collected.values())
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 3);

  const ids = results.flatMap((row) => [row.club_id, row.owner_id]).filter(Boolean) as string[];
  const map = await hydrateClubNames(Array.from(new Set(ids)), supabase);

  const items = results.map((row) => ({
    ...row,
    club_name: row.club_name || (row.club_id ? map[row.club_id] : null) || (row.owner_id ? map[row.owner_id] : null) || null,
  }));

  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (city) params.set('city', city);

  return NextResponse.json({ items, role, profileId, viewAllHref: `/opportunities${params.toString() ? `?${params.toString()}` : ''}` });
}
