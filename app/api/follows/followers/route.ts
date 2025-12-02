import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'athlete' | 'club' | 'guest';

type FollowerItem = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  sport: string | null;
  role: string | null;
  avatarUrl: string | null;
  accountType: 'club' | 'athlete';
  isFollowing: boolean;
};

function normalizeAccountType(raw?: string | null): 'club' | 'athlete' {
  return raw === 'club' ? 'club' : 'athlete';
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return NextResponse.json({ items: [], role: 'guest', profileId: null });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .eq('user_id', userRes.user.id)
    .maybeSingle();

  const role: Role =
    profile?.account_type === 'club' || profile?.account_type === 'athlete'
      ? profile.account_type
      : 'guest';

  if (profileError || !profile?.id || profile.status !== 'active') {
    if (profileError) {
      console.error('[api/follows/followers] errore profilo', profileError);
    }
    return NextResponse.json({ items: [], role, profileId: profile?.id ?? null });
  }

  const profileId = profile.id;

  const { data: followerRows, error: followerError } = await supabase
    .from('follows')
    .select('follower_profile_id')
    .eq('target_profile_id', profileId)
    .limit(400);

  if (followerError) {
    console.error('[api/follows/followers] errore elenco follower', followerError);
    return NextResponse.json({ items: [], role, profileId, error: followerError.message });
  }

  const followerIds = (followerRows || [])
    .map((row) => (row as any)?.follower_profile_id)
    .filter(Boolean) as string[];

  const { data: followingRows } = await supabase
    .from('follows')
    .select('target_profile_id')
    .eq('follower_profile_id', profileId)
    .limit(400);

  const followingSet = new Set(
    (followingRows || [])
      .map((row) => (row as any)?.target_profile_id)
      .filter(Boolean)
      .map((id) => id.toString()),
  );

  if (!followerIds.length) {
    return NextResponse.json({ items: [], role, profileId });
  }

  const { data: followerProfiles, error: profileError2 } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, city, country, sport, role, avatar_url, account_type, status')
    .in('id', followerIds)
    .eq('status', 'active');

  if (profileError2) {
    console.error('[api/follows/followers] errore profili follower', profileError2);
    return NextResponse.json({ items: [], role, profileId, error: profileError2.message });
  }

  const items: FollowerItem[] = (followerProfiles || []).map((p) => ({
    id: p.id,
    name: (p.display_name || p.full_name || 'Profilo').toString(),
    city: p.city || null,
    country: p.country || null,
    sport: p.sport || null,
    role: p.role || null,
    avatarUrl: p.avatar_url || null,
    accountType: normalizeAccountType(p.account_type),
    isFollowing: followingSet.has(p.id?.toString() || ''),
  }));

  return NextResponse.json({ items, role, profileId });
}
