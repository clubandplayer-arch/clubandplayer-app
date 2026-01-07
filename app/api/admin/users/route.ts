import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['pending', 'active', 'rejected', 'orphan']);
const emailRegex = /\S+@\S+\.\S+/;

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
    'id, user_id, display_name, full_name, account_type, country, region, province, city, status, avatar_url, created_at';

  const athleteQuery = dbClient
    .from('athletes_view')
    .select(baseSelect)
    .order('created_at', { ascending: false })
    .limit(200);

  const clubQuery = dbClient
    .from('clubs_view')
    .select(baseSelect)
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter) {
    athleteQuery.eq('status', statusFilter);
    clubQuery.eq('status', statusFilter);
  }

  if (includeOrphans) {
    athleteQuery.is('user_id', null);
    clubQuery.is('user_id', null);
  } else {
    athleteQuery.not('user_id', 'is', null);
    clubQuery.not('user_id', 'is', null);
  }

  const [athletesRes, clubsRes] = await Promise.all([athleteQuery, clubQuery]);
  if (athletesRes.error) return jsonError(athletesRes.error.message, 400);
  if (clubsRes.error) return jsonError(clubsRes.error.message, 400);

  const combined = [...(athletesRes.data ?? []), ...(clubsRes.data ?? [])] as Array<{
    id: string;
    user_id: string | null;
    display_name: string | null;
    full_name: string | null;
    account_type: string | null;
    country: string | null;
    region: string | null;
    province: string | null;
    city: string | null;
    status: string | null;
    avatar_url: string | null;
    created_at: string | null;
  }>;

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

  const userIds = Array.from(
    new Set(dedupedRows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))
  );
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
