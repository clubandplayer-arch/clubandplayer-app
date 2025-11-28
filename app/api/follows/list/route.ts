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

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('target_id, target_type')
    .eq('follower_id', userId)
    .limit(400);

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
    .select('id, display_name, full_name, city, country, sport, role, avatar_url, account_type, status')
    .in('id', ids)
    .eq('status', 'active');

  if (profilesError) {
    return NextResponse.json({ items: [], role, profileId: profile?.id ?? null, error: profilesError.message });
  }

  const profilesMap = new Map(
    (profiles || []).map((p) => [p.id?.toString(), p]),
  );

  const items = (follows || [])
    .map((row) => {
      const key = row?.target_id ? row.target_id.toString() : '';
      if (!key) return null;
      const profile = profilesMap.get(key);
      if (!profile) return null;

      const accountType = profile.account_type === 'club' ? 'club' : 'athlete';

      return {
        id: profile.id,
        name: (profile.display_name || profile.full_name || 'Profilo').toString(),
        city: profile.city || null,
        country: profile.country || null,
        sport: profile.sport || null,
        role: profile.role || null,
        avatarUrl: profile.avatar_url || null,
        accountType,
        targetType: row.target_type || accountType,
        isFollowing: true,
      } as const;
    })
    .filter(Boolean);

  return NextResponse.json({ items, role, profileId: profile?.id ?? null });
}
