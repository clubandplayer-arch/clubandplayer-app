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

  if (!profile?.id || profile.status !== 'active') {
    return NextResponse.json({ items: [], role: profile?.account_type ?? 'guest', profileId: profile?.id ?? null });
  }

  const profileId = profile.id;
  const role: Role = profile.account_type === 'club' || profile.account_type === 'athlete' ? profile.account_type : 'guest';

  const { data: followerRows, error: followerError } = await supabase
    .from('follows')
    .select('follower_id, target_id')
    .eq('target_id', profileId)
    .limit(400);

  if (followerError) {
    return NextResponse.json({ items: [], role, profileId, error: followerError.message });
  }

  const followerIds = (followerRows || [])
    .map((row) => row?.follower_id)
    .filter(Boolean)
    .map((id) => id.toString());

  const { data: followingRows } = await supabase
    .from('follows')
    .select('target_id')
    .eq('follower_id', userId)
    .limit(400);

  const followingSet = new Set(
    (followingRows || [])
      .map((row) => row?.target_id)
      .filter(Boolean)
      .map((id) => id.toString()),
  );

  if (!followerIds.length) {
    return NextResponse.json({ items: [], role, profileId });
  }

  const { data: followerProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, full_name, city, country, sport, role, avatar_url, account_type, status')
    .in('user_id', followerIds)
    .eq('status', 'active');

  if (profileError) {
    return NextResponse.json({ items: [], role, profileId, error: profileError.message });
  }

  const items: FollowerItem[] = (followerProfiles || []).map((p) => ({
    id: p.id,
    name: (p.display_name || p.full_name || 'Profilo').toString(),
    city: p.city || null,
    country: p.country || null,
    sport: p.sport || null,
    role: p.role || null,
    avatarUrl: p.avatar_url || null,
    accountType: p.account_type === 'club' ? 'club' : 'athlete',
    isFollowing: followingSet.has(p.id?.toString() || ''),
  }));

  return NextResponse.json({ items, role, profileId });
}
