import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getPublicProfilesMap } from '@/lib/profiles/publicLookup';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const missingClubColumn = (msg?: string | null) =>
  !!msg && /club_id/i.test(msg) && (/does not exist/i.test(msg) || /schema cache/i.test(msg));

/** GET /api/applications/received  → candidature per le opportunità create dall’utente corrente */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:RECEIVED', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const admin = getSupabaseAdminClientOrNull();

  const runWithFallback = async <T>(fn: (c: any) => Promise<{ data: T | null; error: any }>) => {
    let clientRes = await fn(supabase);
    if (
      clientRes.error &&
      admin &&
      (/row-level security/i.test(clientRes.error.message || '') || /permission/i.test(clientRes.error.message || ''))
    ) {
      clientRes = await fn(admin);
    }
    return clientRes;
  };

  const { data: oppsRawInitial, error: oppErr } = await runWithFallback((client) =>
    client
      .from('opportunities')
      .select('id, title, city, province, region, country, owner_id, created_by')
      .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`)
  );
  if (oppErr) return jsonError(oppErr.message, 400);

  let oppsRaw = Array.isArray(oppsRawInitial) ? oppsRawInitial : [];

  if ((!oppsRaw.length) && admin) {
    const res = await admin
      .from('opportunities')
      .select('id, title, city, province, region, country, owner_id, created_by')
      .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);
    if (!res.error) oppsRaw = res.data;
  }

  const opps = (oppsRaw ?? []).map((row: any) => {
    const ownerId = row.owner_id ?? row.created_by ?? null;
    return { ...row, owner_id: ownerId, created_by: ownerId };
  });

  if (!opps.length) return NextResponse.json({ data: [] });

  const oppIds = opps.map(o => o.id);
  const oppMap = new Map(opps.map((o: any) => [o.id, o]));

  // 2) Candidature su quelle opportunità

  const selectFull = 'id, opportunity_id, athlete_id, club_id, note, status, created_at, updated_at';
  const selectNoClub = 'id, opportunity_id, athlete_id, note, status, created_at, updated_at';

  const runApps = async (
    sel: string,
  ): Promise<{ data: any[] | null; error: any }> =>
    runWithFallback<any[]>((client) =>
      client
        .from('applications')
        .select(sel)
        .in('opportunity_id', oppIds)
        .order('created_at', { ascending: false })
    );

  let rows: any[] | null = null;
  let e2: any = null;

  ({ data: rows, error: e2 } = await runApps(selectFull));
  if (e2 && missingClubColumn(e2.message)) {
    ({ data: rows, error: e2 } = await runApps(selectNoClub));
  }
  if (e2) return jsonError(e2.message, 400);

  if ((!rows || rows.length === 0) && admin) {
    const { data: adminRows, error: adminErr } = await admin
      .from('applications')
      .select(selectFull)
      .in('opportunity_id', oppIds)
      .order('created_at', { ascending: false });

    if (!adminErr && adminRows?.length) {
      rows = adminRows;
    } else if (adminErr && missingClubColumn(adminErr.message)) {
      const { data: fallbackRows, error: fbErr } = await admin
        .from('applications')
        .select(selectNoClub)
        .in('opportunity_id', oppIds)
        .order('created_at', { ascending: false });

      if (!fbErr) rows = fallbackRows;
    }
  }

  const apps = rows ?? [];
  if (!apps.length) return NextResponse.json({ data: [] });

  // 3) Profili atleti (fallback se la JOIN non restituisce nulla)
  const athleteIds = Array.from(
    new Set(apps.map(a => String(a.athlete_id ?? '')).filter(id => id.length > 0))
  );
    const profileClient = admin ?? supabase;
    const profMap = await getPublicProfilesMap(athleteIds, profileClient, {
      fallbackToAdmin: true,
    });

  // 4) Arricchisci con nomi e link sempre disponibili
  const enhanced = apps.map(a => {
    const profile = profMap.get(String(a.athlete_id ?? '')) || null;

    const first = typeof profile?.first_name === 'string' ? profile.first_name.trim() : '';
    const last = typeof profile?.last_name === 'string' ? profile.last_name.trim() : '';
    const nameFromParts = [first, last].filter(Boolean).join(' ').trim() || null;

    const name =
      (profile as any)?.display_name ||
      (profile as any)?.full_name ||
      nameFromParts ||
      null;

    const location = [profile?.city, profile?.province, profile?.region].filter(Boolean).join(' · ');
    const headline = [profile?.role, profile?.sport].filter(Boolean).join(' · ');

    return {
      ...a,
      player_name: name,
      player_location: location,
      player_headline: headline,
      opportunity: oppMap.get(a.opportunity_id) ?? (a as any).opportunity ?? null,
      athlete: profile
        ? {
            ...profile,
            id: (profile as any).user_id ?? (profile as any).id ?? a.athlete_id ?? null,
            name,
          }
        : null,
    };
  });

  return NextResponse.json({ data: enhanced });
});
