import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import {
  dbError,
  errorResponse,
  invalidPayload,
  notAuthenticated,
  notAuthorized,
  notFoundResponse,
  successResponse,
  unknownError,
} from '@/lib/api/standardResponses';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

const EDIT_WINDOW_MS = 30_000;

function extractMessageId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (routeContext?.params as any)?.messageId;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

function isWithinWindow(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= EDIT_WINDOW_MS;
}

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  const messageId = extractMessageId(routeContext);
  const targetId = typeof messageId === 'string' ? messageId.trim() : '';
  if (!targetId) return invalidPayload('messageId mancante');

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body?.content || '').trim();
  if (!content) return invalidPayload('contenuto mancante');

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] PATCH /api/direct-messages/message/:messageId missing profile', { userId: user.id });
      return notAuthenticated('Profilo non trovato');
    }

    const { data: message, error: fetchError } = await supabase
      .from('direct_messages')
      .select('id, sender_profile_id, created_at, deleted_at')
      .eq('id', targetId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!message || !message.id) return notFoundResponse('Messaggio non trovato');
    if (message.deleted_at) return notFoundResponse('Messaggio non disponibile');

    const mine = message.sender_profile_id === me.id;
    if (!mine) return notAuthorized('Puoi modificare solo i tuoi messaggi');

    if (!isWithinWindow(message.created_at as string)) {
      return errorResponse('INVALID_PAYLOAD', 'Tempo per la modifica scaduto', { status: 409 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('direct_messages')
      .update({
        content,
        edited_at: new Date().toISOString(),
        edited_by: me.id,
      })
      .eq('id', targetId)
      .select('id, sender_profile_id, recipient_profile_id, content, created_at, edited_at, edited_by')
      .maybeSingle();

    if (updateError) throw updateError;

    return successResponse({ message: updated });
  } catch (error: any) {
    console.error('[direct-messages] PATCH /api/direct-messages/message/:messageId unexpected error', {
      error,
      messageId: targetId,
      userId: user.id,
    });
    Sentry.captureException(error);
    if (typeof error?.message === 'string') {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'direct-messages/message', error });
  }
});

export const DELETE = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const messageId = extractMessageId(routeContext);
  const targetId = typeof messageId === 'string' ? messageId.trim() : '';
  if (!targetId) return invalidPayload('messageId mancante');

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] DELETE /api/direct-messages/message/:messageId missing profile', { userId: user.id });
      return notAuthenticated('Profilo non trovato');
    }

    const { data: message, error: fetchError } = await supabase
      .from('direct_messages')
      .select('id, sender_profile_id, created_at, deleted_at')
      .eq('id', targetId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!message || !message.id) return notFoundResponse('Messaggio non trovato');
    if (message.deleted_at) return notFoundResponse('Messaggio non disponibile');

    const mine = message.sender_profile_id === me.id;
    if (!mine) return notAuthorized('Puoi eliminare solo i tuoi messaggi');

    if (!isWithinWindow(message.created_at as string)) {
      return errorResponse('INVALID_PAYLOAD', "Tempo per l'eliminazione scaduto", { status: 409 });
    }

    const { data: updated, error: deleteError } = await supabase
      .from('direct_messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: me.id,
      })
      .eq('id', targetId)
      .select('id')
      .maybeSingle();

    if (deleteError) throw deleteError;

    return successResponse({ messageId: updated?.id || targetId });
  } catch (error: any) {
    console.error('[direct-messages] DELETE /api/direct-messages/message/:messageId unexpected error', {
      error,
      messageId: targetId,
      userId: user.id,
    });
    Sentry.captureException(error);
    if (typeof error?.message === 'string') {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'direct-messages/message', error });
  }
});
