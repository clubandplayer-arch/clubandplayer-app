import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import { getPublicProfilesMap } from '@/lib/profiles/publicLookup';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const missingClubColumn = (msg?: string | null) =>
  !!msg && /club_id/i.test(msg) && (/does not exist/i.test(msg) || /schema cache/i.test(msg));

type Role = 'club' | 'athlete';

const APPLICATION_FIELDS =
  'id, opportunity_id, athlete_id, club_id, note, status, created_at, updated_at';

/**
 * GET /api/applications
 *  - club  → candidature ricevute sulle opportunità create dall'utente
 *  - player→ candidature inviate dall'atleta corrente
 */
export const GET = withAuth(async (req: NextRequest, { supabase, user }: any) => {
  try {
    await rateLimit(req as any, { key: 'apps:GET', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const admin = getSupabaseAdminClientOrNull();

  const runWithFallback = async <T>(fn: (c: any) => Promise<{ data: T | null; error: any }>) => {
    let res = await fn(supabase);
    if (
      res.error &&
      admin &&
      (/row-level security/i.test(res.error.message || '') || /permission/i.test(res.error.message || ''))
    ) {
      res = await fn(admin);
    }
    return res;
  };

  // 1) Determina ruolo (club vs athlete)
  let role: Role = 'athlete';
  let profileId: string | null = null;
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, user_id, account_type, type, profile_type')
      .eq('user_id', user.id)
      .maybeSingle();
    profileId = (prof as any)?.id ?? null;
    const raw = String((prof as any)?.account_type || (prof as any)?.type || (prof as any)?.profile_type || '')
      .trim()
      .toLowerCase();
    if (raw.includes('club')) role = 'club';
  } catch {
    // fallback: ruoli legacy
  }

  // 2) Opportunità (solo per club, per athlete arricchiamo dopo)
  const oppSelect = 'id, title, city, province, region, country, owner_id, created_by, club_id';
  let opportunities: any[] = [];

  const ownerKeys = Array.from(new Set([user.id, profileId].filter(Boolean))).map(String);

  if (role === 'club') {
    const { data: oppRows, error: oppErr } = await runWithFallback<any[]>((client) =>
      client
        .from('opportunities')
        .select(oppSelect)
        .or(
          ownerKeys
            .flatMap((id) => [`owner_id.eq.${id}`, `created_by.eq.${id}`, `club_id.eq.${id}`])
            .join(','),
        )
    );
    if (oppErr) return jsonError(oppErr.message, 400);
    opportunities = Array.isArray(oppRows) ? oppRows : [];
  }

  const oppMap = new Map<string, any>(opportunities.map((o: any) => [String(o.id), o]));

  // 3) Candidature
  const oppIds = role === 'club' ? opportunities.map((o: any) => String(o.id)) : [];

  const { data: appRows, error: appsErr } = await runWithFallback<any[]>((client) => {
    if (role === 'club') {
      return client
        .from('applications')
        .select(APPLICATION_FIELDS)
        .in('opportunity_id', oppIds.length ? oppIds : ['__none'])
        .order('created_at', { ascending: false });
    }
    return client
      .from('applications')
      .select(APPLICATION_FIELDS)
      .or(ownerKeys.map((id) => `athlete_id.eq.${id}`).join(','))
      .order('created_at', { ascending: false });
  });
  if (appsErr) return jsonError(appsErr.message, 400);

  const applications = Array.isArray(appRows) ? appRows : [];
  if (!applications.length) return NextResponse.json({ role, data: [] });

  // 4) Enrichment profili
  const athleteIds = new Set<string>();
  const clubIds = new Set<string>();
  const oppIdsForFetch = new Set<string>();

  for (const app of applications) {
    if (app.athlete_id) athleteIds.add(String(app.athlete_id));
    if (app.opportunity_id) oppIdsForFetch.add(String(app.opportunity_id));
    const oppOwner = oppMap.get(String(app.opportunity_id ?? ''));
    const ownerId = app.club_id || oppOwner?.owner_id || oppOwner?.created_by || oppOwner?.club_id;
    if (ownerId) clubIds.add(String(ownerId));
  }

  const oppsToFetch = Array.from(oppIdsForFetch).filter((id) => id && !oppMap.has(id));
  if (oppsToFetch.length) {
    const { data: extraOpps } = await runWithFallback<any[]>((client) =>
      client
        .from('opportunities')
        .select(oppSelect)
        .in('id', oppsToFetch)
    );
    (extraOpps || []).forEach((o: any) => oppMap.set(String(o.id), o));
  }

  const profilesClient = admin ?? supabase;
  const athleteMap = await getPublicProfilesMap(Array.from(athleteIds), profilesClient, {
    fallbackToAdmin: true,
  });
  const clubMap = await getPublicProfilesMap(Array.from(clubIds), profilesClient, {
    fallbackToAdmin: true,
  });

  const toLocation = (o: any) =>
    [o?.city, o?.province, o?.region, o?.country].filter(Boolean).join(' · ');

  const data = applications.map((app: any) => {
    const opportunity = oppMap.get(String(app.opportunity_id ?? '')) || null;
    const ownerId = app.club_id || opportunity?.owner_id || opportunity?.created_by || null;
    const athleteProfile = athleteMap.get(String(app.athlete_id ?? '')) || null;
    const clubProfile = ownerId ? clubMap.get(String(ownerId)) || null : null;

    const counterparty = role === 'club' ? athleteProfile : clubProfile;
    const counterpartyName =
      role === 'club'
        ? buildPlayerDisplayName(counterparty?.full_name, counterparty?.display_name, 'Player')
        : buildClubDisplayName(counterparty?.full_name, counterparty?.display_name, 'Club');

    return {
      ...app,
      opportunity: opportunity
        ? {
            id: opportunity.id,
            title: opportunity.title ?? null,
            location: toLocation(opportunity),
          }
        : { id: app.opportunity_id },
      counterparty: counterparty
        ? {
            id: counterparty.id,
            profile_id: counterparty.profile_id ?? counterparty.id,
            user_id: counterparty.user_id ?? null,
            full_name: counterparty.full_name ?? null,
            display_name: counterparty.display_name ?? null,
            avatar_url: counterparty.avatar_url ?? null,
            account_type: counterparty.account_type ?? (role === 'club' ? 'athlete' : 'club'),
            name: counterpartyName,
          }
        : null,
    } as any;
  });

  return NextResponse.json({ role, data });
});

/** POST /api/applications  Body: { opportunity_id: string, note?: string } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }: any) => {
  await rateLimit(req as any, { key: 'apps:POST', limit: 30, window: '1m' } as any);

  const body = await req.json().catch(() => null);
  if (!body || !body.opportunity_id) return jsonError('Missing opportunity_id', 400);

  let myProfileId: string | null = null;
  try {
    const { data: meProfile } = await supabase
      .from('profiles')
      .select('id, account_type, type, profile_type')
      .eq('user_id', user.id)
      .maybeSingle();
    myProfileId = (meProfile as any)?.id ?? null;
  } catch {
    // ignore profile lookup failures
  }

  const opportunity_id = String(body.opportunity_id);
  const note = typeof body.note === 'string'
    ? body.note.trim() || null
    : typeof body.message === 'string'
      ? body.message.trim() || null
      : null;

  // verifica exist e che non sia tua
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by')
    .eq('id', opportunity_id)
    .single();

  if (oppErr) return jsonError(oppErr.message, 400);
  const ownerId = opp?.owner_id ?? opp?.created_by ?? null;
  if (ownerId && (ownerId === user.id || ownerId === myProfileId)) {
    return jsonError('Cannot apply to your own opportunity', 400);
  }

  // evita doppia candidatura
  const athleteIds = Array.from(new Set([user.id, myProfileId].filter(Boolean))).map(String);
  const { data: exists } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', opportunity_id)
    .in('athlete_id', athleteIds.length ? athleteIds : ['__none'])
    .maybeSingle();

  if (exists) return jsonError('Already applied', 409);

  const admin = getSupabaseAdminClientOrNull();

  const insertPayload = {
    opportunity_id,
    athlete_id: myProfileId ?? user.id,
    club_id: ownerId,
    note,
    status: 'pending',
  } as Record<string, any>;

  const runInsert = (client: any, payload: Record<string, any>, select: string) =>
    client.from('applications').insert(payload).select(select).single();

  let data: any = null;
  let error: any = null;

  ({ data, error } = await runInsert(supabase, insertPayload, 'id, opportunity_id, athlete_id, created_at, club_id, status'));

  if (error && missingClubColumn(error.message)) {
    const { club_id: _clubId, ...fallbackPayload } = insertPayload;
    ({ data, error } = await runInsert(supabase, fallbackPayload, 'id, opportunity_id, athlete_id, created_at, status'));
  }

  if (error && /row-level security/i.test(error.message || '') && admin) {
    ({ data, error } = await runInsert(admin, insertPayload, 'id, opportunity_id, athlete_id, created_at, club_id, status'));
  }

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
