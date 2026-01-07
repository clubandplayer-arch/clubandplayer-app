import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['pending', 'active', 'rejected', 'orphan']);
const emailRegex = /\S+@\S+\.\S+/;

const ACCOUNT_TYPE_ATHLETE = new Set(['athlete', 'player']);
const ACCOUNT_TYPE_CLUB = new Set(['club']);

export const GET = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const filterStatus = status && allowedStatuses.has(status) ? status : 'pending';
  const includeOrphans = filterStatus === 'orphan';
  const statusFilter = includeOrphans ? null : filterStatus;
  const adminClient = getSupabaseAdminClientOrNull();
  const dbClient = adminClient ?? supabase;

  const baseSelect =
    'id, user_id, account_type, type, full_name, display_name, country, region, province, city, status, avatar_url, created_at';

  const profilesQuery = dbClient
    .from('profiles')
    .select(baseSelect)
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter) profilesQuery.eq('status', statusFilter);
  if (includeOrphans) {
    profilesQuery.is('user_id', null);
  } else {
    profilesQuery.not('user_id', 'is', null);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    console.error('[admin/users] profiles query error', profilesError);
    return jsonError('Errore nel caricamento utenti', 400);
  }

  const profileRows = (profiles ?? []) as Array<{
    id: string;
    user_id: string | null;
    account_type: string | null;
    type?: string | null;
    display_name: string | null;
    full_name: string | null;
    country: string | null;
    region: string | null;
    province: string | null;
    city: string | null;
    status: string | null;
    avatar_url: string | null;
    created_at: string | null;
  }>;

  const athleteIds = profileRows
    .filter((row) => {
      const kind = (row.account_type ?? row.type ?? '').toLowerCase();
      return ACCOUNT_TYPE_ATHLETE.has(kind);
    })
    .map((row) => row.id);
  const clubIds = profileRows
    .filter((row) => {
      const kind = (row.account_type ?? row.type ?? '').toLowerCase();
      return ACCOUNT_TYPE_CLUB.has(kind);
    })
    .map((row) => row.id);

  const [athletesRes, clubsRes] = await Promise.all([
    athleteIds.length
      ? dbClient.from('athletes_view').select('*').in('id', athleteIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    clubIds.length
      ? dbClient.from('clubs_view').select('*').in('id', clubIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (athletesRes.error) {
    console.error('[admin/users] athletes_view query error', athletesRes.error);
    return jsonError('Errore nel caricamento utenti', 400);
  }
  if (clubsRes.error) {
    console.error('[admin/users] clubs_view query error', clubsRes.error);
    return jsonError('Errore nel caricamento utenti', 400);
  }

  const athleteMap = new Map<string, Record<string, unknown>>();
  for (const row of athletesRes.data ?? []) {
    if (row?.id) athleteMap.set(String(row.id), row as Record<string, unknown>);
  }
  const clubMap = new Map<string, Record<string, unknown>>();
  for (const row of clubsRes.data ?? []) {
    if (row?.id) clubMap.set(String(row.id), row as Record<string, unknown>);
  }

  const combined = profileRows.map((row) => {
    const kind = (row.account_type ?? row.type ?? '').toLowerCase();
    const detail =
      ACCOUNT_TYPE_ATHLETE.has(kind) ? athleteMap.get(row.id) : ACCOUNT_TYPE_CLUB.has(kind) ? clubMap.get(row.id) : null;
    return {
      ...row,
      full_name: (detail?.full_name as string | null | undefined) ?? row.full_name,
      display_name: (detail?.display_name as string | null | undefined) ?? row.display_name,
      avatar_url: (detail?.avatar_url as string | null | undefined) ?? row.avatar_url,
      country: (detail?.country as string | null | undefined) ?? row.country,
      region: (detail?.region as string | null | undefined) ?? row.region,
      province: (detail?.province as string | null | undefined) ?? row.province,
      city: (detail?.city as string | null | undefined) ?? row.city,
    };
  });

  const deduped = new Map<string, (typeof combined)[number]>();
  for (const row of combined) {
    const key = row.user_id ? `user:${row.user_id}` : `profile:${row.id}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
      continue;
    }
    const existingCreated = existing.created_at ? Date.parse(existing.created_at) : 0;
    const nextCreated = row.created_at ? Date.parse(row.created_at) : 0;
    if (nextCreated > existingCreated) deduped.set(key, row);
  }

  const dedupedRows = Array.from(deduped.values());
  dedupedRows.sort((a, b) => {
    const aCreated = a.created_at ? Date.parse(a.created_at) : 0;
    const bCreated = b.created_at ? Date.parse(b.created_at) : 0;
    return bCreated - aCreated;
  });

  const userIds = Array.from(new Set(dedupedRows.map((row) => row.user_id).filter((id): id is string => Boolean(id))));
  const emailByUserId = new Map<string, string>();
  if (adminClient && userIds.length > 0) {
    await Promise.all(
      userIds.map(async (id) => {
        const { data, error } = await adminClient.auth.admin.getUserById(id);
        if (!error && data?.user?.email) {
          emailByUserId.set(id, data.user.email);
        }
      })
    );
  }

  const data = dedupedRows.map((row) => {
    const email = row.user_id ? emailByUserId.get(row.user_id) ?? null : null;
    const displayName =
      row.full_name?.trim() ||
      (row.display_name && !emailRegex.test(row.display_name) ? row.display_name : null) ||
      null;
    return {
      ...row,
      display_name: displayName,
      email,
    };
  });

  return NextResponse.json({ data });
});
