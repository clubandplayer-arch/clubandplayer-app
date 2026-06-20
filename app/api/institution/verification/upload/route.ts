import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getInstitutionContext, institutionOnlyError } from '../utils';

export const runtime = 'nodejs';
const BUCKET = 'institution-verification-docs';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DOCUMENT_TYPES = new Set(['visura', 'ade_certificate']);

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: `institution-verification:upload:${user.id}`, limit: 20, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }
  const ctx = await getInstitutionContext(supabase, user.id);
  if (!ctx) return institutionOnlyError();
  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError('Payload non valido', 400);
  const file = formData.get('file');
  const documentType = String(formData.get('documentType') ?? '').trim();
  if (!DOCUMENT_TYPES.has(documentType)) return jsonError('Tipo documento non valido', 400);
  if (!(file instanceof File)) return jsonError('File mancante', 400);
  if (file.type !== 'application/pdf') return jsonError('Sono ammessi solo file PDF', 400);
  if (file.size > MAX_FILE_SIZE) return jsonError('File troppo grande (max 10MB)', 400);
  const admin = getSupabaseAdminClient();
  const { data: latest, error: latestError } = await admin.from('institution_verification_requests').select('id,status').eq('institution_id', ctx.profileId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (latestError) return jsonError(latestError.message, 400);
  let requestId = latest?.id as string | undefined;
  const status = String(latest?.status ?? '');
  if (status === 'submitted' || status === 'approved') return jsonError('La richiesta è già in valutazione', 409);
  if (!requestId || status === 'rejected') {
    const { data: created, error } = await admin.from('institution_verification_requests').insert({ institution_id: ctx.profileId, status: 'draft', document_type: documentType }).select('id').maybeSingle();
    if (error) return jsonError(error.message, 400);
    requestId = created?.id as string | undefined;
  }
  if (!requestId) return jsonError('Impossibile creare la richiesta', 400);
  const path = `${ctx.profileId}/${requestId}.pdf`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (uploadError) return jsonError(uploadError.message, 400);
  const { data: updated, error } = await admin.from('institution_verification_requests').update({ document_path: path, document_type: documentType, updated_at: new Date().toISOString() }).eq('id', requestId).select('*').maybeSingle();
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true, request: updated ?? null });
});
