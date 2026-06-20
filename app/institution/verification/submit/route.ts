import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getInstitutionContext } from '@/app/api/institution/verification/utils';

export const runtime = 'nodejs';

const BUCKET = 'institution-verification-docs';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ENTITY_TYPES = new Set(['Federazione', 'EPS', 'Comitato Regionale', 'Comitato Provinciale', 'Delegazione', 'Lega']);
const DOCUMENT_TYPES = new Set(['visura', 'ade_certificate']);
const clean = (v: unknown) => String(v ?? '').trim();
const redirectBack = (req: NextRequest, params: Record<string, string>) => {
  const url = new URL('/institution/verification', req.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, 303);
};
const normalizeWebsite = (value: unknown) => {
  const text = clean(value);
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^www\./i.test(text)) return `https://${text}`;
  return text;
};

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const ctx = await getInstitutionContext(supabase, user.id).catch(() => null);
  if (!ctx) return redirectBack(req, { error: 'Operazione disponibile solo per il ruolo Ente' });

  const formData = await req.formData().catch(() => null);
  if (!formData) return redirectBack(req, { error: 'Payload non valido' });

  const payload = {
    entity_type: clean(formData.get('entityType')),
    entity_name: clean(formData.get('entityName')),
    fiscal_code: clean(formData.get('fiscalCode')),
    vat_number: clean(formData.get('vatNumber')),
    email: clean(formData.get('email')),
    pec: clean(formData.get('pec')),
    website: normalizeWebsite(formData.get('website')),
    representative: clean(formData.get('representative')),
    document_type: clean(formData.get('documentType')),
  };

  if (!ENTITY_TYPES.has(payload.entity_type)) return redirectBack(req, { error: 'Tipologia ente non valida' });
  if (!DOCUMENT_TYPES.has(payload.document_type)) return redirectBack(req, { error: 'Tipo documento non valido' });
  if (!payload.entity_name || !payload.fiscal_code || !payload.vat_number || !payload.email || !payload.pec || !payload.website || !payload.representative) {
    return redirectBack(req, { error: 'Compila tutti i campi obbligatori' });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return redirectBack(req, { error: 'File mancante' });
  if (file.type !== 'application/pdf') return redirectBack(req, { error: 'Sono ammessi solo file PDF' });
  if (file.size > MAX_FILE_SIZE) return redirectBack(req, { error: 'File troppo grande (max 10MB)' });

  const admin = getSupabaseAdminClient();
  const { data: latest, error: latestError } = await admin
    .from('institution_verification_requests')
    .select('id,status')
    .eq('institution_id', ctx.profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return redirectBack(req, { error: latestError.message });

  const latestStatus = String(latest?.status ?? '');
  if (latestStatus === 'submitted' || latestStatus === 'approved') return redirectBack(req, { sent: '1' });

  let requestId = latest?.id as string | undefined;
  if (!requestId || latestStatus === 'rejected') {
    const { data: created, error } = await admin
      .from('institution_verification_requests')
      .insert({ institution_id: ctx.profileId, status: 'draft', document_type: payload.document_type })
      .select('id')
      .maybeSingle();
    if (error) return redirectBack(req, { error: error.message });
    requestId = created?.id as string | undefined;
  }
  if (!requestId) return redirectBack(req, { error: 'Impossibile creare la richiesta' });

  const path = `${ctx.profileId}/${requestId}.pdf`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (uploadError) return redirectBack(req, { error: uploadError.message });

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from('institution_verification_requests')
    .update({ ...payload, document_path: path, status: 'submitted', submitted_at: now, updated_at: now })
    .eq('id', requestId);
  if (updateError) return redirectBack(req, { error: updateError.message });

  await admin.from('profiles').update({ full_name: payload.entity_name, display_name: payload.entity_name, role: 'Ente', updated_at: now }).eq('id', ctx.profileId);

  return redirectBack(req, { sent: '1' });
});
