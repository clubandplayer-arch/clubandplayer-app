import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'club' | 'athlete' | 'staff' | 'guest';

const BASE_SELECT =
  'id,title,description,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name,gender,club_id,owner_id,created_by,status,role_group';

function clampLimit(value: string | null, fallback = 10) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(30, Math.max(1, Math.floor(n)));
}

function normalizeRole(accountType: string | null | undefined): Role {
  const value = String(accountType ?? '').trim().toLowerCase();
  if (value === 'club' || value === 'athlete' || value === 'staff') return value;
  return 'guest';
}

function isOpenStatus(status: string | null | undefined) {
  const value = String(status ?? '').trim().toLowerCase();
  return !value || value === 'open' || value === 'aperto';
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const limit = clampLimit(new URL(req.url).searchParams.get('limit'));

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .eq('user_id', userRes.user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const role = normalizeRole(profile?.account_type);
  const viewerProfileId = profile?.id ?? null;

  if (!viewerProfileId) {
    return NextResponse.json({ ok: true, role, items: [], meta: { followedClubsCount: 0, totalReturned: 0 } });
  }

  const { data: followRows, error: followsError } = await supabase
    .from('follows')
    .select('target_profile_id')
    .eq('follower_profile_id', viewerProfileId)
    .neq('target_profile_id', viewerProfileId);

  if (followsError) {
    return NextResponse.json({ ok: false, error: followsError.message }, { status: 500 });
  }

  const targetIds = Array.from(new Set((followRows ?? []).map((row: any) => row?.target_profile_id).filter(Boolean)));
  if (!targetIds.length) {
    return NextResponse.json({ ok: true, role, items: [], meta: { followedClubsCount: 0, totalReturned: 0 } });
  }

  const { data: clubProfiles, error: clubProfilesError } = await supabase
    .from('profiles')
    .select('id, account_type')
    .in('id', targetIds)
    .eq('account_type', 'club');

  if (clubProfilesError) {
    return NextResponse.json({ ok: false, error: clubProfilesError.message }, { status: 500 });
  }

  const followedClubIds = Array.from(new Set((clubProfiles ?? []).map((row) => row.id).filter(Boolean)));
  if (!followedClubIds.length) {
    return NextResponse.json({ ok: true, role, items: [], meta: { followedClubsCount: 0, totalReturned: 0 } });
  }

  const { data: rows, error: opportunitiesError } = await supabase
    .from('opportunities')
    .select(BASE_SELECT)
    .in('club_id', followedClubIds)
    .order('created_at', { ascending: false })
    .limit(limit * 2);

  if (opportunitiesError) {
    return NextResponse.json({ ok: false, error: opportunitiesError.message }, { status: 500 });
  }

  const items = (rows ?? []).filter((row: any) => isOpenStatus(row?.status)).slice(0, limit);

  return NextResponse.json({
    ok: true,
    role,
    items,
    meta: {
      followedClubsCount: followedClubIds.length,
      totalReturned: items.length,
    },
  });
}
