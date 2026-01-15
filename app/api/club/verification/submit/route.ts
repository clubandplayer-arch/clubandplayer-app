import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { clubOnlyError, getClubContext } from '../utils';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `club-verification:submit:${user.id}`, limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  let clubContext = null;
  try {
    clubContext = await getClubContext(supabase, user.id);
  } catch (error) {
    console.error('[club-verification][SUBMIT] errore profilo club', error);
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubContext) return clubOnlyError();

  const { data: latestRequest, error } = await supabase
    .from('club_verification_requests')
    .select('id, status, certificate_path')
    .eq('club_id', clubContext.clubId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!latestRequest?.id) return jsonError('Nessuna richiesta disponibile', 400);

  const status = String(latestRequest.status ?? '').toLowerCase();
  if (status !== 'draft') return jsonError('La richiesta non è in bozza', 409);
  if (!latestRequest.certificate_path) return jsonError('Carica il certificato PDF prima di inviare', 400);

  const { data: updated, error: updateError } = await supabase
    .from('club_verification_requests')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', latestRequest.id)
    .select('*')
    .maybeSingle();

  if (updateError) return jsonError(updateError.message, 400);

  return NextResponse.json({ ok: true, request: updated ?? null });
});
