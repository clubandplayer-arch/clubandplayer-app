import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getPublicProfilesMap } from '@/lib/profiles/publicLookup';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** GET /api/applications/received  → candidature per le opportunità create dall’utente corrente */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:RECEIVED', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  // 1) Opportunità dell’owner
  const { data: oppsOwner, error: eOwner } = await supabase
    .from('opportunities')
    .select('id, title, city, province, region, country, owner_id')
    .eq('owner_id', user.id);
  if (eOwner) return jsonError(eOwner.message, 400);

  let opps = oppsOwner ?? [];

  // Fallback per dati legacy con colonna created_by popolata
  if (!opps.length) {
    const { data: legacyOpps, error: legacyErr } = await supabase
      .from('opportunities')
      .select('id, title, city, province, region, country, created_by')
      .eq('created_by', user.id);
    if (legacyErr) return jsonError(legacyErr.message, 400);
    opps = (legacyOpps ?? []).map((row: any) => ({ ...row, owner_id: row.created_by }));
  }

  if (!opps.length) return NextResponse.json({ data: [] });

  const oppIds = opps.map(o => o.id);
  const oppMap = new Map(
    opps.map((o: any) => {
      const ownerId = o.owner_id ?? o.created_by ?? null;
      return [o.id, { ...o, owner_id: ownerId, created_by: ownerId }];
    })
  );

  // 2) Candidature su quelle opportunità
  const admin = getSupabaseAdminClientOrNull();
  const client = admin ?? supabase;

  const { data: rows, error: e2 } = await client
    .from('applications')
    .select(
      `
        id, opportunity_id, athlete_id, note, status, created_at, updated_at,
        opportunity:opportunities(id, title, city, province, region, country),
        athlete:profiles!applications_athlete_id_fkey(
          id, user_id, display_name, full_name, first_name, last_name,
          headline, bio, sport, role, country, region, province, city, avatar_url
        )
      `
    )
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
    const joined = (a as any).athlete || null;
    const profile = joined || profMap.get(String(a.athlete_id ?? '')) || null;

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
