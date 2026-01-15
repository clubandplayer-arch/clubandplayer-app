import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const STATUS_VALUES = new Set(['draft', 'submitted', 'approved', 'rejected']);

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const url = new URL(req.url);
  const status = (url.searchParams.get('status') || '').trim().toLowerCase();
  const statusFilter = STATUS_VALUES.has(status) ? status : null;

  let query = adminClient
    .from('club_verification_requests')
    .select('id,club_id,status,submitted_at,payment_status,verified_until,created_at')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);

  const rows = (data ?? []).map((row) => ({
    id: row.id as string,
    club_id: row.club_id as string,
    status: row.status as string,
    submitted_at: row.submitted_at as string | null,
    payment_status: row.payment_status as string | null,
    verified_until: row.verified_until as string | null,
    created_at: row.created_at as string | null,
  }));

  const clubIds = Array.from(new Set(rows.map((row) => row.club_id).filter(Boolean)));
  let clubs: Record<string, { name: string | null }> = {};

  if (clubIds.length) {
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', clubIds);

    if (profileError) return jsonError(profileError.message, 400);

    clubs = (profiles ?? []).reduce((acc, profile: any) => {
      acc[String(profile.id)] = {
        name: profile.full_name ?? profile.display_name ?? null,
      };
      return acc;
    }, {} as Record<string, { name: string | null }>);
  }

  return NextResponse.json({ data: rows, clubs });
});
