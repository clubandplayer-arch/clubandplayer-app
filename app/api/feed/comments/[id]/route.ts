import { NextRequest, NextResponse } from 'next/server';
import {
  dbError,
  notAuthenticated,
  notAuthorized,
  notFoundError,
  notReady,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PatchCommentSchema, type PatchCommentInput } from '@/lib/validation/feed';

export const runtime = 'nodejs';

const EDIT_WINDOW_MS = 60_000;
const MAX_LEN = 800;

function resolveCommentId(params: { id?: string } | undefined) {
  const raw = params?.id;
  if (typeof raw === 'string') return raw.trim();
  return '';
}

function sanitizeBody(raw: unknown) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  return text.slice(0, MAX_LEN);
}

function isWithinWindow(createdAt?: string | null) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= EDIT_WINDOW_MS;
}

export async function PATCH(req: NextRequest, { params }: { params: { id?: string } }) {
  const commentId = resolveCommentId(params);
  if (!commentId) return validationError('commentId mancante');

  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const bodyJson = await req.json().catch(() => ({}));
  const parsed = PatchCommentSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return validationError('Payload non valido', parsed.error.flatten());
  }

  const payload: PatchCommentInput = parsed.data;
  const body = sanitizeBody(payload.body);
  if (!body) return validationError('Testo obbligatorio');

  try {
    const { data: comment, error: loadError } = await supabase
      .from('post_comments')
      .select('id, post_id, author_id, body, created_at')
      .eq('id', commentId)
      .maybeSingle();

    if (loadError) {
      const code = (loadError as any)?.code as string | undefined;
      if (code === '42501' || code === '42P01' || code === 'PGRST204') {
        return notReady('Commenti non pronti');
      }
      return unknownError({
        endpoint: '/api/feed/comments/[id]',
        error: loadError,
        context: { method: 'PATCH', stage: 'select', commentId },
      });
    }

    if (!comment) return notFoundError('Commento non trovato');

    if (comment.author_id !== auth.user.id) {
      return notAuthorized('Puoi modificare solo i tuoi commenti');
    }

    if (!isWithinWindow(comment.created_at)) {
      return NextResponse.json(
        { ok: false, error: 'EDIT_WINDOW_EXPIRED', message: 'Tempo per la modifica scaduto' },
        { status: 409 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('post_comments')
      .update({ body })
      .eq('id', commentId)
      .select('id, post_id, author_id, body, created_at')
      .maybeSingle();

    if (updateError || !updated) {
      return dbError('Errore aggiornamento commento', { message: updateError?.message });
    }

    return successResponse({ comment: updated });
  } catch (error) {
    return unknownError({
      endpoint: '/api/feed/comments/[id]',
      error,
      context: { method: 'PATCH', commentId },
    });
  }
}
