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
import { sendPushForNotificationBestEffort } from '@/lib/push/sendExpoPush';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

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

function isMissingAttachmentColumn(error: any) {
  const message = String(error?.message || error?.details || '');
  return error?.code === '42703' || error?.code === 'PGRST204' || message.includes('attachment_path');
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function toPushPreview(value: unknown) {
  return cleanText(value)?.slice(0, 120) ?? '';
}

async function resolveSenderName(admin: any, senderProfileId: string) {
  const { data: sender } = await admin
    .from('profiles')
    .select('id, display_name, full_name, account_type')
    .eq('id', senderProfileId)
    .maybeSingle();

  if (!sender?.id) return 'un utente';

  const senderAccountType = String(sender.account_type ?? '').toLowerCase();
  if (senderAccountType === 'club') {
    const { data: club } = await admin
      .from('clubs_view')
      .select('display_name')
      .eq('id', senderProfileId)
      .maybeSingle();
    return cleanText(club?.display_name) || cleanText(sender.display_name) || cleanText(sender.full_name) || 'un utente';
  }

  if (senderAccountType === 'athlete') {
    const { data: athlete } = await admin
      .from('athletes_view')
      .select('display_name, full_name')
      .eq('id', senderProfileId)
      .maybeSingle();
    return (
      cleanText(athlete?.display_name) ||
      cleanText(athlete?.full_name) ||
      cleanText(sender.display_name) ||
      cleanText(sender.full_name) ||
      'un utente'
    );
  }

  return cleanText(sender.display_name) || cleanText(sender.full_name) || 'un utente';
}

async function notifyDirectMessage(params: {
  recipientProfileId: string;
  senderProfileId: string;
  messageId: string;
  preview: string;
}) {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) return;

  const { recipientProfileId, senderProfileId, messageId, preview } = params;
  const { data: recipient } = await admin
    .from('profiles')
    .select('user_id')
    .eq('id', recipientProfileId)
    .maybeSingle();

  if (!recipient?.user_id) return;
  const recipientUserId = String(recipient.user_id);
  const normalizedPreview = toPushPreview(preview);
  const senderName = await resolveSenderName(admin, senderProfileId);

  const { data: insertedNotification } = await admin
    .from('notifications')
    .insert({
      user_id: recipientUserId,
      recipient_profile_id: recipientProfileId,
      actor_profile_id: senderProfileId,
      kind: 'message',
      payload: {
        sender_profile_id: senderProfileId,
        thread_id: senderProfileId,
        recipient_profile_id: recipientProfileId,
        message_id: messageId,
        preview: normalizedPreview,
      },
      read: false,
    })
    .select('id')
    .maybeSingle();

  if (insertedNotification?.id) {
    await sendPushForNotificationBestEffort({
      supabase: admin,
      userId: recipientUserId,
      notificationId: String(insertedNotification.id),
      kind: 'message',
      payload: {
        message_id: messageId,
        thread_id: senderProfileId,
        sender_profile_id: senderProfileId,
        recipient_profile_id: recipientProfileId,
        sender_name: senderName,
        preview: normalizedPreview,
      },
    });
  }
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
      .select('id, sender_profile_id, recipient_profile_id, content, attachment_path, created_at, edited_at, edited_by')
      .or(
        `and(sender_profile_id.eq.${me.id},recipient_profile_id.eq.${peer.id}),and(sender_profile_id.eq.${peer.id},recipient_profile_id.eq.${me.id})`,
      )
      .is('deleted_at', null);

    if (clearedAt) {
      messagesQuery = messagesQuery.gt('created_at', clearedAt);
    }

    let { data: rows, error } = await messagesQuery.order('created_at', { ascending: true });

    // Keep existing chats usable while the additive attachment migration rolls
    // out. PostgREST rejects the entire select when its schema cache does not
    // know the new column yet, so retry with the legacy projection.
    if (error && isMissingAttachmentColumn(error)) {
      let legacyQuery = supabase
        .from('direct_messages')
        .select('id, sender_profile_id, recipient_profile_id, content, created_at, edited_at, edited_by')
        .or(
          `and(sender_profile_id.eq.${me.id},recipient_profile_id.eq.${peer.id}),and(sender_profile_id.eq.${peer.id},recipient_profile_id.eq.${me.id})`,
        )
        .is('deleted_at', null);
      if (clearedAt) legacyQuery = legacyQuery.gt('created_at', clearedAt);
      const legacyResult = await legacyQuery.order('created_at', { ascending: true });
      rows = legacyResult.data as any;
      error = legacyResult.error;
    }

    if (error) throw error;

    return successResponse({
      messages: (rows || []).map((row: any) => ({
        ...row,
        attachment_url: row.attachment_path ? `/api/direct-messages/attachment/${row.id}` : null,
        attachment_path: undefined,
      })),
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

  const isMultipart = req.headers.get('content-type')?.includes('multipart/form-data');
  const formData = isMultipart ? await req.formData().catch(() => null) : null;
  const jsonBody = !isMultipart ? await req.json().catch(() => ({} as { content?: string })) : null;
  const content = String(formData?.get('content') || jsonBody?.content || '').trim();
  const attachmentValue = formData?.get('attachment');
  const attachment = attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null;
  if (!content && !attachment) {
    console.warn('[direct-messages] POST /api/direct-messages/:profileId validation error', {
      userId: user.id,
      targetProfileId: otherId,
      reason: 'contenuto mancante',
    });
    return invalidPayload('Inserisci un messaggio o allega una foto');
  }
  if (attachment && (!attachment.type.startsWith('image/') || attachment.size > 10 * 1024 * 1024)) {
    return invalidPayload('La foto deve essere JPG, PNG, WebP o HEIC e non superare 10 MB');
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

    const attachmentSchemaProbe = await supabase.from('direct_messages').select('attachment_path').limit(1);
    const attachmentSchemaAvailable = !attachmentSchemaProbe.error;
    if (attachmentSchemaProbe.error && !isMissingAttachmentColumn(attachmentSchemaProbe.error)) {
      throw attachmentSchemaProbe.error;
    }
    if (attachment && !attachmentSchemaAvailable) {
      return invalidPayload('Gli allegati saranno disponibili appena completato l’aggiornamento del database');
    }

    let attachmentPath: string | null = null;
    if (attachment) {
      // Sharp is a native, comparatively heavy dependency. Load it only for an
      // actual upload so reading an existing conversation never depends on the
      // image-processing runtime being initialized successfully.
      const { compressDirectMessageImage } = await import('@/lib/images/compressDirectMessageImage');
      const optimized = await compressDirectMessageImage(Buffer.from(await attachment.arrayBuffer()));
      attachmentPath = `${me.id}/${crypto.randomUUID()}.${optimized.extension}`;
      const { error: uploadError } = await supabase.storage
        .from('direct-message-images')
        .upload(attachmentPath, optimized.buffer, {
          contentType: optimized.contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;
    }

    const messageValues = {
      sender_profile_id: me.id,
      recipient_profile_id: peer.id,
      content: content || null,
    };
    const insertQuery = supabase
      .from('direct_messages')
      .insert(attachmentSchemaAvailable ? { ...messageValues, attachment_path: attachmentPath } : messageValues);
    const insertResult = attachmentSchemaAvailable
      ? await insertQuery
          .select('id, sender_profile_id, recipient_profile_id, content, attachment_path, created_at, edited_at, edited_by')
          .maybeSingle()
      : await insertQuery
          .select('id, sender_profile_id, recipient_profile_id, content, created_at, edited_at, edited_by')
          .maybeSingle();
    const { data: inserted, error } = insertResult;

    if (error) {
      if (attachmentPath) {
        await supabase.storage.from('direct-message-images').remove([attachmentPath]);
      }
      throw error;
    }

    if (inserted?.id) {
      await notifyDirectMessage({
        recipientProfileId: peer.id,
        senderProfileId: me.id,
        messageId: inserted.id as string,
        preview: content || '📷 Foto',
      });
    }

    return successResponse({
      message: inserted ? {
        ...inserted,
        attachment_url: (inserted as any).attachment_path ? `/api/direct-messages/attachment/${inserted.id}` : null,
        attachment_path: undefined,
      } : null,
    });
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
