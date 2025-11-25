import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['pending', 'active', 'rejected']);

export const GET = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const filterStatus = status && allowedStatuses.has(status) ? status : 'pending';

  const query = supabase
    .from('profiles')
    .select(
      'user_id, display_name, full_name, account_type, country, region, province, city, status, avatar_url, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filterStatus) query.eq('status', filterStatus);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ data });
});
