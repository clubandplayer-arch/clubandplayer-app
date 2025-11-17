import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getPublicProfilesMap } from '@/lib/profiles/publicLookup';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** GET /api/applications/received  → candidature per le opportunità create dall’utente corrente */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:RECEIVED', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  // 1) Client admin obbligatorio per bypassare le RLS sulle candidature
  let client = supabase;
  try {
    client = getSupabaseAdminClient();
  } catch (err: any) {
    return jsonError(
      'Servizio non configurato: aggiungi SUPABASE_SERVICE_ROLE_KEY per leggere le candidature',
      500,
    );
  }

  const { data: oppsRaw, error: oppErr } = await client
    .from('opportunities')
    .select('id, title, city, province, region, country, owner_id, created_by')
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);
  if (oppErr) return jsonError(oppErr.message, 400);

  const opps = (oppsRaw ?? []).map((row: any) => {
    const ownerId = row.owner_id ?? row.created_by ?? null;
    return { ...row, owner_id: ownerId, created_by: ownerId };
  });

  if (!opps.length) return NextResponse.json({ data: [] });

  const oppIds = opps.map(o => o.id);
  const oppMap = new Map(opps.map((o: any) => [o.id, o]));

  // 2) Candidature su quelle opportunità

  const { data: rows, error: e2 } = await client
    .from('applications')
    .select('id, opportunity_id, athlete_id, note, status, created_at, updated_at')
    .in('opportunity_id', oppIds)
    .order('created_at', { ascending: false });
  if (e2) return jsonError(e2.message, 400);

  const apps = rows ?? [];
  if (!apps.length) return NextResponse.json({ data: [] });

  // 3) Profili atleti (fallback se la JOIN non restituisce nulla)
  const athleteIds = Array.from(
    new Set(apps.map(a => String(a.athlete_id ?? '')).filter(id => id.length > 0))
  );
  const profMap = await getPublicProfilesMap(athleteIds, client, {
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

    return {
      ...a,
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
