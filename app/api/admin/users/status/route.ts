import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['pending', 'active', 'rejected']);

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const targetId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';

  if (!targetId || !allowedStatuses.has(status)) {
    return jsonError('Parametri non validi', 400);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', targetId)
    .select('user_id, status')
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});
