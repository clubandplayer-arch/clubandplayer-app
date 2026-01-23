import { type NextRequest, NextResponse } from 'next/server';
import {
  dbError,
  notAuthenticated,
  notReady,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { UpdateCommentSchema, type UpdateCommentInput } from '@/lib/validation/feed';

export const runtime = 'nodejs';

const MAX_LEN = 800;
const EDIT_WINDOW_MS = 60_000;

function sanitizeBody(raw: unknown) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  return text.slice(0, MAX_LEN);
}

async function buildClubVerificationMap(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, clubIds: string[]) {
  if (!clubIds.length) return new Map<string, boolean>();
  try {
    const admin = getSupabaseAdminClientOrNull();
    const verificationClient = admin ?? supabase;
    const { data, error } = await verificationClient
      .from('club_verification_requests')
      .select('club_id, status, payment_status, verified_until, created_at')
      .in('club_id', clubIds)
      .eq('status', 'approved')
      .in('payment_status', ['paid', 'waived'])
      .gt('verified_until', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    const map = new Map<string, boolean>();
    (data ?? []).forEach((row: any) => {
      if (!row?.club_id || map.has(String(row.club_id))) return;
      map.set(String(row.club_id), true);
    });
    return map;
  } catch (error) {
    console.error('[api/feed/comments] club verification lookup failed', {
      message: error instanceof Error ? error.message : (error as any)?.message ?? null,
      details: (error as any)?.details ?? null,
      hint: (error as any)?.hint ?? null,
      code: (error as any)?.code ?? null,
    });
    return new Map<string, boolean>();
  }
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const bodyJson = await req.json().catch(() => ({}));
  const parsed = UpdateCommentSchema.safeParse(bodyJson);
  if (!parsed.success) {
    console.warn('[api/feed/comments][PATCH] invalid payload', parsed.error.flatten());
    return validationError('Payload non valido', parsed.error.flatten());
  }

  const payload: UpdateCommentInput = parsed.data;
  const body = sanitizeBody(payload.body);

  if (!body) {
    return validationError('Commento non valido', { body: ['Il commento non può essere vuoto'] });
  }

  const { data: existing, error: existingErr } = await supabase
    .from('post_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('id', id)
    .maybeSingle();

  if (existingErr) {
    const code = (existingErr as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01' || code === 'PGRST204') {
      return notReady('Commenti non pronti');
    }
    return unknownError({
      endpoint: '/api/feed/comments/[id]',
      error: existingErr,
      context: { method: 'PATCH', stage: 'select', id },
    });
  }

  if (!existing) {
    return NextResponse.json(
      { ok: false, code: 'NOT_FOUND', message: 'Commento non trovato' },
      { status: 404 },
    );
  }

  if (String(existing.author_id) !== String(auth.user.id)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Non puoi modificare questo commento' },
      { status: 403 },
    );
  }

  const createdAtMs = new Date(existing.created_at).getTime();
  const ageMs = Date.now() - createdAtMs;

  if (!Number.isFinite(ageMs) || ageMs > EDIT_WINDOW_MS) {
    return NextResponse.json(
      {
        ok: false,
        code: 'EDIT_WINDOW_EXPIRED',
        message: 'Puoi modificare il commento solo entro 60 secondi dalla pubblicazione',
      },
      { status: 409 },
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from('post_comments')
    .update({ body })
    .eq('id', id)
    .select('id, post_id, author_id, body, created_at')
    .maybeSingle();

  if (updateErr || !updated) {
    const code = (updateErr as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01') {
      return notReady('Commenti non pronti');
    }
    return dbError('Errore nel salvataggio della modifica', { message: updateErr?.message });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
    .eq('user_id', updated.author_id)
    .maybeSingle();

  const verificationMap = profile?.id ? await buildClubVerificationMap(supabase, [String(profile.id)]) : new Map();
  const isClub = profile?.account_type === 'club';
  const profileWithVerification = profile
    ? { ...profile, is_verified: isClub ? verificationMap.get(String(profile.id)) ?? false : null }
    : null;

  return successResponse({
    comment: {
      ...updated,
      author: profileWithVerification,
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const { data: existing, error: existingErr } = await supabase
    .from('post_comments')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (existingErr) {
    const code = (existingErr as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01' || code === 'PGRST204') {
      return notReady('Commenti non pronti');
    }
    return unknownError({
      endpoint: '/api/feed/comments/[id]',
      error: existingErr,
      context: { method: 'DELETE', stage: 'select', id },
    });
  }

  if (!existing) {
    return NextResponse.json(
      { ok: false, code: 'NOT_FOUND', message: 'Commento non trovato' },
      { status: 404 },
    );
  }

  if (String(existing.author_id) !== String(auth.user.id)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Non puoi eliminare questo commento' },
      { status: 403 },
    );
  }

  const { error: deleteErr } = await supabase.from('post_comments').delete().eq('id', id);

  if (deleteErr) {
    const code = (deleteErr as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01') {
      return notReady('Commenti non pronti');
    }
    return dbError('Errore nella cancellazione del commento', { message: deleteErr.message });
  }

  return successResponse({ ok: true });
}
