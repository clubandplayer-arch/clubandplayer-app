import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  staffProfileId: z.string().min(1, 'staffProfileId obbligatorio'),
  inStaff: z.boolean(),
  staffRole: z.string().trim().max(120).nullable().optional(),
});

type ClubProfile = { id: string };

type StaffMember = {
  relationId: string;
  staffProfileId: string;
  status: string;
  staffRole: string | null;
  createdAt: string | null;
  staff: {
    id: string;
    fullName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    city: string | null;
    province: string | null;
    region: string | null;
    country: string | null;
    sport: string | null;
  };
};

async function getClubProfileForUser(supabase: any, userId: string): Promise<ClubProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, account_type, type, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) return null;

  const accountType = String((data as any)?.account_type ?? (data as any)?.type ?? '').toLowerCase();
  const status = String((data as any)?.status ?? '').toLowerCase();
  if (accountType !== 'club') return null;
  if (status && status !== 'active') return null;

  return { id: data.id as string };
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `clubs:staff:get:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  let clubProfile: ClubProfile | null = null;
  try {
    clubProfile = await getClubProfileForUser(supabase, user.id);
  } catch (error: any) {
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubProfile) return jsonError('Solo i club possono visualizzare lo staff', 403);

  const { data: rows, error } = await supabase
    .from('club_staff_members')
    .select('id,staff_profile_id,staff_role,status,created_at')
    .eq('club_profile_id', clubProfile.id)
    .order('created_at', { ascending: true });

  if (error) return jsonError(error.message, 400);

  const staffIds = (rows || []).map((row: any) => row.staff_profile_id).filter(Boolean);
  let staffMap = new Map<string, any>();

  if (staffIds.length) {
    const { data: profiles, error: staffErr } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, avatar_url, bio, city, province, region, country, sport, account_type, type, status')
      .in('id', staffIds);

    if (staffErr) return jsonError(staffErr.message, 400);
    staffMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  }

  const staff: StaffMember[] = (rows || [])
    .map((row: any) => {
      const profile = staffMap.get(row.staff_profile_id);
      if (!profile?.id) return null;
      const accountType = String(profile.account_type ?? profile.type ?? '').toLowerCase();
      if (accountType !== 'staff') return null;

      return {
        relationId: row.id as string,
        staffProfileId: row.staff_profile_id as string,
        status: row.status as string,
        staffRole: row.staff_role ?? null,
        createdAt: row.created_at ?? null,
        staff: {
          id: profile.id as string,
          fullName: profile.full_name ?? null,
          displayName: profile.display_name ?? null,
          avatarUrl: profile.avatar_url ?? null,
          bio: profile.bio ?? null,
          city: profile.city ?? null,
          province: profile.province ?? null,
          region: profile.region ?? null,
          country: profile.country ?? null,
          sport: profile.sport ?? null,
        },
      } as StaffMember;
    })
    .filter(Boolean) as StaffMember[];

  return NextResponse.json({ ok: true, staff });
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `clubs:staff:post:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError('Payload non valido', 400, { details: parsed.error.flatten() });

  const { staffProfileId, inStaff, staffRole } = parsed.data;

  let clubProfile: ClubProfile | null = null;
  try {
    clubProfile = await getClubProfileForUser(supabase, user.id);
  } catch {
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubProfile) return jsonError('Solo i club possono modificare lo staff', 403);
  if (clubProfile.id === staffProfileId) return jsonError('Non puoi aggiungere il tuo stesso profilo', 400);

  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id,account_type,type,status')
    .eq('id', staffProfileId)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 400);
  if (!targetProfile?.id || String(targetProfile.status ?? '').toLowerCase() !== 'active') {
    return jsonError('Profilo staff non trovato o non attivo', 404);
  }

  const targetType = String((targetProfile as any).account_type ?? (targetProfile as any).type ?? '').toLowerCase();
  if (targetType !== 'staff') return jsonError('Il profilo selezionato non è staff', 400);

  if (inStaff) {
    const { error: upsertError } = await supabase
      .from('club_staff_members')
      .upsert(
        {
          club_profile_id: clubProfile.id,
          staff_profile_id: staffProfileId,
          staff_role: staffRole ?? null,
          status: 'active',
          created_by: user.id,
        },
        { onConflict: 'club_profile_id,staff_profile_id' },
      );

    if (upsertError) return jsonError(upsertError.message, 400);

    return NextResponse.json({ ok: true, inStaff: true, staffProfileId, staffRole: staffRole ?? null });
  }

  const { error: updateError } = await supabase
    .from('club_staff_members')
    .update({ status: 'inactive' })
    .eq('club_profile_id', clubProfile.id)
    .eq('staff_profile_id', staffProfileId);

  if (updateError) return jsonError(updateError.message, 400);

  return NextResponse.json({ ok: true, inStaff: false, staffProfileId });
});
