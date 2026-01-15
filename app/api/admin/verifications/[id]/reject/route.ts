import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = await routeContext?.params;
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return jsonError('Id mancante', 400);

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return jsonError('Motivo rifiuto obbligatorio', 400);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const now = new Date();

  const { data, error } = await adminClient
    .from('club_verification_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: now.toISOString(),
      reviewer_id: user.id,
    })
    .eq('id', id)
    .select('id,status,reviewed_at,reviewer_id,rejection_reason')
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true, request: data ?? null });
});
