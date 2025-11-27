import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function nowMinusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
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
    .select('id, account_type, status, country, city')
    .eq('user_id', userId)
    .maybeSingle();

  const role =
    (profile?.account_type === 'club' || profile?.account_type === 'athlete'
      ? profile.account_type
      : 'guest') || 'guest';

  const profileId = profile?.id ?? null;
  const country = (profile?.country || '').trim();
  const city = (profile?.city || '').trim();

  const baseSelect =
    'id,title,description,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name,gender,owner_id,created_by,status';

  if (role === 'club') {
    const owners = Array.from(new Set([profileId, userId].filter(Boolean)));
    let query = supabase
      .from('opportunities')
      .select(baseSelect)
      .order('created_at', { ascending: false })
      .limit(5);

    if (owners.length === 1) {
      query = query.or(`owner_id.eq.${owners[0]},created_by.eq.${owners[0]}`);
    } else if (owners.length > 1) {
      const list = `(${owners.join(',')})`;
      query = query.or(`owner_id.in.${list},created_by.in.${list}`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ items: [], role, profileId, error: error.message });
    }

    const items = (data || []).map((row) => ({
      ...row,
      club_name: row.club_name || null,
    }));

    return NextResponse.json({ items, role, profileId });
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

  const items = (data || []).map((row) => ({
    ...row,
    club_name: row.club_name || null,
  }));

  return NextResponse.json({ items, role, profileId });
}
