import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return NextResponse.json({ items: [], role: 'guest', profileId: null });
  }

  const userId = userRes.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .eq('user_id', userId)
    .maybeSingle();

  const role =
    (profile?.account_type === 'athlete' || profile?.account_type === 'club'
      ? profile.account_type
      : 'guest') || 'guest';

  const targetProfileType = role === 'club' ? 'athlete' : 'club';
  const followTargetTypes = targetProfileType === 'athlete' ? ['player', 'athlete'] : ['club'];

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('target_id, target_type')
    .eq('follower_id', userId)
    .in('target_type', followTargetTypes)
    .limit(50);

  if (followsError) {
    return NextResponse.json({ items: [], role, profileId: profile?.id ?? null, error: followsError.message });
  }

  const ids = (follows || [])
    .map((row) => (row as any)?.target_id)
    .filter(Boolean)
    .map((id) => id.toString());

  if (!ids.length) {
    return NextResponse.json({ items: [], role, profileId: profile?.id ?? null });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, city, sport, avatar_url, account_type, status')
    .in('id', ids)
    .eq('status', 'active')
    .eq('account_type', targetProfileType);

  if (profilesError) {
    return NextResponse.json({ items: [], role, profileId: profile?.id ?? null, error: profilesError.message });
  }

  const items = (profiles || []).map((p) => ({
    id: p.id,
    name: (p.display_name || p.full_name || 'Profilo').toString(),
    city: p.city || null,
    sport: p.sport || null,
    avatarUrl: p.avatar_url || null,
    accountType: p.account_type || targetProfileType,
  }));

  return NextResponse.json({ items, role, profileId: profile?.id ?? null });
}
