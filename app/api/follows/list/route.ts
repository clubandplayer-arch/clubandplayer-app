import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'athlete' | 'club' | 'guest';

type Item = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  sport: string | null;
  role: string | null;
  avatarUrl: string | null;
  accountType: 'club' | 'athlete';
  targetType: 'club' | 'player';
};

function accountTypeFromProfile(raw?: string | null): 'club' | 'athlete' {
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
      console.error('[api/follows/list] errore profilo', profileError);
    }
    return NextResponse.json({ items: [], role, profileId: profile?.id ?? null });
  }

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('target_id, target_type, created_at')
    .eq('follower_id', profile.id)
    .limit(400);

  if (followsError) {
    console.error('[api/follows/list] errore lettura follows', followsError);
    return NextResponse.json({ items: [], role, profileId: profile.id, error: followsError.message });
  }

  const targetIds = (follows || [])
    .map((row) => row?.target_id)
    .filter(Boolean) as string[];

  if (!targetIds.length) {
    return NextResponse.json({ items: [], role, profileId: profile.id });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, city, country, sport, role, avatar_url, account_type, status')
    .in('id', targetIds)
    .eq('status', 'active');

  if (profilesError) {
    console.error('[api/follows/list] errore profili target', profilesError);
    return NextResponse.json({ items: [], role, profileId: profile.id, error: profilesError.message });
  }

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p]),
  );

  const items: Item[] = (follows || [])
    .map((row) => {
      const pid = row?.target_id;
      if (!pid) return null;
      const p = profileMap.get(pid);
      if (!p) return null;
      const accountType = accountTypeFromProfile(p.account_type);
      return {
        id: p.id,
        name: (p.display_name || p.full_name || 'Profilo').toString(),
        city: p.city || null,
        country: p.country || null,
        sport: p.sport || null,
        role: p.role || null,
        avatarUrl: p.avatar_url || null,
        accountType,
        targetType: row?.target_type === 'club' ? 'club' : 'player',
      } as Item;
    })
    .filter(Boolean) as Item[];

  return NextResponse.json({ items, role, profileId: profile.id });
}
