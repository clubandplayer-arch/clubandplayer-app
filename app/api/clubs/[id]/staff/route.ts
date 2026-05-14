import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

type PublicClubStaffMember = {
  id: string;
  profileId: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  staffRole: string | null;
  profileRole: string | null;
  location: {
    city: string | null;
    province: string | null;
    region: string | null;
    country: string | null;
  };
  sport: string | null;
  certified: boolean | null;
  bio: string | null;
};

export const runtime = 'nodejs';

function extractClubId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (routeContext?.params as any)?.id;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

export const GET = withAuth(async (req: NextRequest, { supabase }, routeContext) => {
  try {
    await rateLimit(req, { key: 'clubs:public-staff:get', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const clubId = extractClubId(routeContext);
  const targetClubId = typeof clubId === 'string' ? clubId.trim() : '';
  if (!targetClubId) return jsonError('clubId mancante', 400);

  const { data: clubProfile, error: clubError } = await supabase
    .from('profiles')
    .select('id, account_type, type, status')
    .eq('id', targetClubId)
    .maybeSingle();

  if (clubError) return jsonError(clubError.message, 400);
  if (!clubProfile?.id) return jsonError('Club non trovato', 404);

  const clubAccountType = String(clubProfile.account_type ?? clubProfile.type ?? '').toLowerCase();
  const clubStatus = String(clubProfile.status ?? '').toLowerCase();
  if (clubAccountType !== 'club' || (clubStatus && clubStatus !== 'active')) {
    return jsonError('Club non trovato', 404);
  }

  const { data: staffRows, error: staffError } = await supabase
    .from('club_staff_members')
    .select('id,staff_profile_id,staff_role,status,created_at')
    .eq('club_profile_id', targetClubId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (staffError) return jsonError(staffError.message, 400);

  const staffIds = (staffRows ?? []).map((row: any) => row.staff_profile_id).filter(Boolean);
  if (!staffIds.length) return NextResponse.json({ ok: true, staff: [] });

  const { data: staffProfiles, error: staffProfilesError } = await supabase
    .from('profiles')
    .select('id,full_name,display_name,avatar_url,bio,sport,role,city,province,region,country,account_type,type,status')
    .in('id', staffIds);

  if (staffProfilesError) return jsonError(staffProfilesError.message, 400);

  const staffProfileMap = new Map(
    (staffProfiles ?? []).map((staffProfile: any) => [staffProfile.id, staffProfile]),
  );

  const staff: PublicClubStaffMember[] = (staffRows ?? [])
    .map((row: any) => {
      const profile = staffProfileMap.get(row.staff_profile_id);
      if (!profile?.id) return null;

      const accountType = String(profile.account_type ?? profile.type ?? '').toLowerCase();
      const status = String(profile.status ?? '').toLowerCase();

      if (accountType !== 'staff') return null;
      if (status && status !== 'active') return null;

      return {
        id: row.id as string,
        profileId: profile.id as string,
        fullName: profile.full_name ?? null,
        displayName: profile.display_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        staffRole: row.staff_role ?? null,
        profileRole: profile.role ?? null,
        location: {
          city: profile.city ?? null,
          province: profile.province ?? null,
          region: profile.region ?? null,
          country: profile.country ?? null,
        },
        sport: profile.sport ?? null,
        certified: null,
        bio: profile.bio ?? null,
      } satisfies PublicClubStaffMember;
    })
    .filter(Boolean) as PublicClubStaffMember[];

  return NextResponse.json({ ok: true, staff });
});
