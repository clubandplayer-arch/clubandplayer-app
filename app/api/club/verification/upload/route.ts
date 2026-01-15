import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { clubOnlyError, getClubContext } from '../utils';

export const runtime = 'nodejs';

const BUCKET = 'club-verification-certs';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `club-verification:upload:${user.id}`, limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  let clubContext = null;
  try {
    clubContext = await getClubContext(supabase, user.id);
  } catch (error) {
    console.error('[club-verification][UPLOAD] errore profilo club', error);
    return jsonError('Errore nel recuperare il profilo club', 400);
  }

  if (!clubContext) return clubOnlyError();

  if (process.env.NODE_ENV !== 'production') {
    console.info('[club-verification][UPLOAD] debug', {
      authUserId: user.id,
      detectedClubId: clubContext.clubId,
    });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError('Payload non valido', 400);

  const file = formData.get('file');
  if (!(file instanceof File)) return jsonError('File mancante', 400);

  if (file.type !== 'application/pdf') return jsonError('Sono ammessi solo file PDF', 400);
  if (file.size > MAX_FILE_SIZE) return jsonError('File troppo grande (max 10MB)', 400);

  const { data: latestRequest, error: latestError } = await supabase
    .from('club_verification_requests')
    .select('id, status')
    .eq('club_id', clubContext.clubId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return jsonError(latestError.message, 400);

  let requestId = latestRequest?.id as string | undefined;
  const latestStatus = (latestRequest?.status ?? '').toString();

  if (!requestId || latestStatus === 'rejected') {
    const { data: created, error: createError } = await supabase
      .from('club_verification_requests')
      .insert({ club_id: clubContext.clubId, status: 'draft' })
      .select('id')
      .maybeSingle();

    if (createError) return jsonError(createError.message, 400);
    requestId = created?.id as string | undefined;
  }

  if (!requestId) return jsonError('Impossibile creare la richiesta', 400);

  if (latestStatus === 'submitted' || latestStatus === 'approved') {
    return jsonError('La richiesta è già in valutazione', 409);
  }

  const path = `${clubContext.clubId}/${requestId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: 'application/pdf', upsert: true });

  if (uploadError) return jsonError(uploadError.message, 400);

  const { data: updated, error: updateError } = await supabase
    .from('club_verification_requests')
    .update({ certificate_path: path, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('*')
    .maybeSingle();

  if (updateError) return jsonError(updateError.message, 400);

  return NextResponse.json({ ok: true, request: updated ?? null });
});
