import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { clubOnlyError, getClubContext } from '../utils';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `club-verification:status:${user.id}`, limit: 30, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  let clubContext = null;
  try {
    clubContext = await getClubContext(supabase, user.id);
  } catch (error) {
    console.error('[club-verification][STATUS] errore profilo club', error);
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubContext) return clubOnlyError();

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('club_verification_requests')
    .select('id,status,submitted_at,reviewed_at,rejection_reason,verified_until,payment_status,paid_at,created_at,updated_at')
    .eq('club_id', clubContext.clubId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ request: data ?? null });
});
