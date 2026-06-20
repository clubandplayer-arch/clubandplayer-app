import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getInstitutionContext, institutionOnlyError } from '../utils';

export const runtime = 'nodejs';
const ENTITY_TYPES = new Set(['Federazione', 'EPS', 'Comitato Regionale', 'Comitato Provinciale', 'Delegazione', 'Lega']);
const DOCUMENT_TYPES = new Set(['visura', 'ade_certificate']);
const clean = (v: unknown) => String(v ?? '').trim();

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: `institution-verification:submit:${user.id}`, limit: 20, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }
  const ctx = await getInstitutionContext(supabase, user.id);
  if (!ctx) return institutionOnlyError();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = {
    entity_type: clean(body.entityType), entity_name: clean(body.entityName), fiscal_code: clean(body.fiscalCode), vat_number: clean(body.vatNumber) || null,
    email: clean(body.email), pec: clean(body.pec), website: clean(body.website) || null, representative: clean(body.representative), document_type: clean(body.documentType),
  };
  if (!ENTITY_TYPES.has(payload.entity_type)) return jsonError('Tipologia ente non valida', 400);
  if (!DOCUMENT_TYPES.has(payload.document_type)) return jsonError('Tipo documento non valido', 400);
  if (!payload.entity_name || !payload.fiscal_code || !payload.email || !payload.pec || !payload.representative) return jsonError('Compila tutti i campi obbligatori', 400);
  const admin = getSupabaseAdminClient();
  const { data: latest, error } = await admin.from('institution_verification_requests').select('id,status,document_path').eq('institution_id', ctx.profileId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!latest?.id) return jsonError('Carica il documento PDF prima di inviare', 400);
  if (String(latest.status) !== 'draft') return jsonError('La richiesta non è in bozza', 409);
  if (!latest.document_path) return jsonError('Carica il documento PDF prima di inviare', 400);
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin.from('institution_verification_requests').update({ ...payload, status: 'submitted', submitted_at: now, updated_at: now }).eq('id', latest.id).select('*').maybeSingle();
  if (updateError) return jsonError(updateError.message, 400);
  await admin.from('profiles').update({ full_name: payload.entity_name, display_name: payload.entity_name, email: payload.email, role: 'Ente', updated_at: now }).eq('id', ctx.profileId);
  return NextResponse.json({ ok: true, request: updated ?? null });
});
