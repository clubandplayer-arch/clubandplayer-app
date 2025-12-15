import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import {
  dbError,
  invalidPayload,
  notAuthenticated,
  notFoundResponse,
  successResponse,
  unknownError,
} from '@/lib/api/standardResponses';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';

export const runtime = 'nodejs';

function extractProfileId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (routeContext?.params as any)?.profileId;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

function isMissingHiddenThreadsTable(error: any) {
  return typeof error?.message === 'string'
    ? error.message.includes('direct_message_hidden_threads') ||
        error.message.includes('relation "direct_message_hidden_threads"')
    : error?.code === '42P01';
}

export const GET = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return invalidPayload('profileId mancante');

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] GET /api/direct-messages/:profileId missing profile', { userId: user.id, targetProfileId });
      return notAuthenticated('Profilo non trovato');
    }

    console.log('[direct-messages] GET /api/direct-messages/:profileId', {
      userId: user.id,
      profileId: me.id,
      targetProfileId: otherId,
    });

    const peer = await getProfileById(supabase, otherId);
    if (!peer) {
      console.warn('[direct-messages] GET /api/direct-messages/:profileId target not found', {
        userId: user.id,
        profileId: me.id,
        targetProfileId: otherId,
      });
      return notFoundResponse('Profilo target non trovato');
    }

    let clearedAt: string | null = null;

    try {
      const { data: hiddenRow, error: hiddenError } = await supabase
        .from('direct_message_hidden_threads')
        .select('cleared_at')
        .eq('owner_profile_id', me.id)
        .eq('other_profile_id', peer.id)
        .maybeSingle();

      if (hiddenError) throw hiddenError;
      clearedAt = hiddenRow?.cleared_at ? (hiddenRow.cleared_at as string) : null;
    } catch (hiddenError: any) {
      if (!isMissingHiddenThreadsTable(hiddenError)) {
        throw hiddenError;
      }
      console.warn('[direct-messages] GET /api/direct-messages/:profileId missing table direct_message_hidden_threads');
    }

    let messagesQuery = supabase
      .from('direct_messages')
      .select('id, sender_profile_id, recipient_profile_id, content, created_at, edited_at, edited_by')
      .or(
        `and(sender_profile_id.eq.${me.id},recipient_profile_id.eq.${peer.id}),and(sender_profile_id.eq.${peer.id},recipient_profile_id.eq.${me.id})`,
      )
      .is('deleted_at', null);

    if (clearedAt) {
      messagesQuery = messagesQuery.gt('created_at', clearedAt);
    }

    const { data: rows, error } = await messagesQuery.order('created_at', { ascending: true });

    if (error) throw error;

    return successResponse({
      messages: rows || [],
      peer: {
        id: peer.id,
        display_name: peer.display_name,
        account_type: peer.account_type,
        avatar_url: peer.avatar_url,
      },
      currentProfileId: me.id,
    });
  } catch (error: any) {
    console.error('[direct-messages] GET /api/direct-messages/:profileId unexpected error', {
      error,
      targetProfileId: otherId,
      userId: user.id,
    });
    Sentry.captureException(error);
    if (typeof error?.message === 'string') {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'direct-messages/profileId', error });
  }
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return invalidPayload('profileId mancante');

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body?.content || '').trim();
  if (!content) {
    console.warn('[direct-messages] POST /api/direct-messages/:profileId validation error', {
      userId: user.id,
      targetProfileId: otherId,
      reason: 'contenuto mancante',
    });
    return invalidPayload('contenuto mancante');
  }

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] POST /api/direct-messages/:profileId missing profile', { userId: user.id });
      return notAuthenticated('Profilo non trovato');
    }

    console.log('[direct-messages] POST /api/direct-messages/:profileId', {
      userId: user.id,
      profileId: me.id,
      targetProfileId: otherId,
      messageLength: content.length,
    });

    const peer = await getProfileById(supabase, otherId);
    if (!peer) {
      console.warn('[direct-messages] POST /api/direct-messages/:profileId target not found', {
        userId: user.id,
        profileId: me.id,
        targetProfileId: otherId,
      });
      return notFoundResponse('Profilo target non trovato');
    }

    const { data: inserted, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_profile_id: me.id,
        recipient_profile_id: peer.id,
        content,
      })
      .select('id, sender_profile_id, recipient_profile_id, content, created_at, edited_at, edited_by')
      .maybeSingle();

    if (error) throw error;

    return successResponse({ message: inserted });
  } catch (error: any) {
    console.error('[direct-messages] POST /api/direct-messages/:profileId unexpected error', {
      error,
      targetProfileId: otherId,
      userId: user.id,
    });
    Sentry.captureException(error);
    if (typeof error?.message === 'string') {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'direct-messages/profileId', error });
  }
});
