import { NextResponse } from 'next/server';
import { getLatestOpenOpportunitiesByClub } from '@/lib/data/opportunities';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function nowMinusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function hydrateClubNames(ids: string[], supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  if (!ids.length) return {} as Record<string, string>;

  const { data } = await supabase
    .from('profiles')
    .select('id,user_id,display_name,full_name')
    .in('id', ids);

  return (data || []).reduce((acc, row) => {
    const name = row.display_name || row.full_name;
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
    .select('id, account_type, status, country, city, interest_country, interest_city, display_name, full_name')
    .eq('user_id', userId)
    .maybeSingle();

  const role =
    (profile?.account_type === 'club' || profile?.account_type === 'athlete'
      ? profile.account_type
      : 'guest') || 'guest';

  const profileId = profile?.id ?? null;
  const profileName = profile?.display_name || profile?.full_name || null;
  const country = (profile?.interest_country || profile?.country || '').trim();
  const city = (profile?.interest_city || profile?.city || '').trim();

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

  // athlete o guest: mostra opportunità recenti nella stessa zona
  const filters: Array<(q: any) => any> = [];
  if (country) filters.push((q) => q.eq('country', country));
  if (city) filters.push((q) => q.eq('city', city));

  let query = supabase
    .from('opportunities')
    .select(baseSelect)
    .order('created_at', { ascending: false })
    .limit(5)
    .gte('created_at', nowMinusDays(30));

  filters.forEach((fn) => {
    query = fn(query);
  });

  query = query.or('status.eq.open,status.is.null');

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ items: [], role, profileId, error: error.message });
  }

  const ids = (data || []).flatMap((row) => [row.club_id, row.owner_id]).filter(Boolean) as string[];
  const map = await hydrateClubNames(Array.from(new Set(ids)), supabase);

  const items = (data || []).map((row) => ({
    ...row,
    club_name: row.club_name || (row.club_id ? map[row.club_id] : null) || (row.owner_id ? map[row.owner_id] : null) || null,
  }));

  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (city) params.set('city', city);

  return NextResponse.json({ items, role, profileId, viewAllHref: `/opportunities${params.toString() ? `?${params.toString()}` : ''}` });
}
