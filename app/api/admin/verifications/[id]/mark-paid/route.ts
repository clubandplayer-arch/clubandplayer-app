import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = await routeContext?.params;
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return jsonError('Id mancante', 400);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { data, error } = await adminClient
    .from('club_verification_requests')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
    .select('id,payment_status,paid_at')
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true, request: data ?? null });
});
