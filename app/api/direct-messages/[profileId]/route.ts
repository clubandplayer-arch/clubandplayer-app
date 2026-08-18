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
  return error?.code === '42703' || error?.code === 'PGRST204' || message.includes('attachment_path') || message.includes('voice_path');
}

function isMissingReactionsTable(error: any) {
  const message = String(error?.message || error?.details || '');
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('direct_message_reactions');
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function isWebpBuffer(buffer: Buffer) {
  return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
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
      .select('id, sender_profile_id, recipient_profile_id, content, attachment_path, voice_path, voice_mime_type, created_at, edited_at, edited_by')
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

    let reactions: any[] = [];
    const messageIds = (rows || []).map((row: any) => row.id).filter(Boolean);
    if (messageIds.length) {
      const reactionResult = await supabase.from('direct_message_reactions')
        .select('id, message_id, profile_id, emoji, created_at').in('message_id', messageIds);
      if (reactionResult.error && !isMissingReactionsTable(reactionResult.error)) throw reactionResult.error;
      reactions = reactionResult.data || [];
    }

    let peerOnline = false;
    let peerLastReadAt: string | null = null;
    const admin = getSupabaseAdminClientOrNull();
    if (admin) {
      const onlineCutoff = new Date(Date.now() - 75_000).toISOString();
      const [presenceResult, readResult] = await Promise.all([
        admin.from('profile_presence').select('last_seen_at').eq('profile_id', peer.id).gte('last_seen_at', onlineCutoff).maybeSingle(),
        admin.from('direct_message_read_state').select('last_read_at').eq('owner_profile_id', peer.id).eq('other_profile_id', me.id).maybeSingle(),
      ]);
      // Additive migrations can briefly lag behind an application deployment.
      if (!presenceResult.error) peerOnline = Boolean(presenceResult.data?.last_seen_at);
      if (!readResult.error) peerLastReadAt = readResult.data?.last_read_at ?? null;
    }

    return successResponse({
      messages: (rows || []).map((row: any) => ({
        ...row,
        attachment_url: row.attachment_path ? `/api/direct-messages/attachment/${row.id}` : null,
        voice_url: row.voice_path ? `/api/direct-messages/voice/${row.id}` : null,
        attachment_path: undefined,
        voice_path: undefined,
        reactions: reactions.filter((reaction) => reaction.message_id === row.id),
      })),
      peer: {
        id: peer.id,
        display_name: peer.display_name,
        account_type: peer.account_type,
        avatar_url: peer.avatar_url,
      },
      currentProfileId: me.id,
      peerOnline,
      peerLastReadAt,
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
  const voiceValue = formData?.get('voice');
  const voice = voiceValue instanceof File && voiceValue.size > 0 ? voiceValue : null;
  if (!content && !attachment && !voice) {
    console.warn('[direct-messages] POST /api/direct-messages/:profileId validation error', {
      userId: user.id,
      targetProfileId: otherId,
      reason: 'contenuto mancante',
    });
    return invalidPayload('Inserisci un messaggio o allega una foto');
  }
  if (attachment && (attachment.type !== 'image/webp' || attachment.size > 1_500_000)) {
    return invalidPayload('La foto deve essere ottimizzata in WebP e non superare 1,5 MB');
  }
  const allowedVoiceTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']);
  if (voice && (!allowedVoiceTypes.has(voice.type) || voice.size > 5_000_000)) {
    return invalidPayload('Il messaggio vocale non è valido o supera 5 MB');
  }
  if (attachment && voice) return invalidPayload('Invia una foto o un messaggio vocale alla volta');

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

    const attachmentSchemaProbe = await supabase.from('direct_messages').select('attachment_path, voice_path').limit(1);
    const attachmentSchemaAvailable = !attachmentSchemaProbe.error;
    if (attachmentSchemaProbe.error && !isMissingAttachmentColumn(attachmentSchemaProbe.error)) {
      throw attachmentSchemaProbe.error;
    }
    if ((attachment || voice) && !attachmentSchemaAvailable) {
      return invalidPayload('Gli allegati saranno disponibili appena completato l’aggiornamento del database');
    }

    let attachmentPath: string | null = null;
    let voicePath: string | null = null;
    if (attachment) {
      const attachmentBuffer = Buffer.from(await attachment.arrayBuffer());
      if (!isWebpBuffer(attachmentBuffer)) return invalidPayload('Il file allegato non è una foto WebP valida');
      attachmentPath = `${me.id}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('direct-message-images')
        .upload(attachmentPath, attachmentBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });
      if (uploadError) throw uploadError;
    }
    if (voice) {
      const extension = voice.type === 'audio/ogg' ? 'ogg' : voice.type === 'audio/mp4' ? 'm4a' : voice.type === 'audio/mpeg' ? 'mp3' : 'webm';
      voicePath = `${me.id}/${crypto.randomUUID()}.${extension}`;
      const { error: voiceUploadError } = await supabase.storage
        .from('direct-message-audio')
        .upload(voicePath, Buffer.from(await voice.arrayBuffer()), { contentType: voice.type, upsert: false });
      if (voiceUploadError) throw voiceUploadError;
    }

    const messageValues = {
      sender_profile_id: me.id,
      recipient_profile_id: peer.id,
      content: content || null,
    };
    const insertQuery = supabase
      .from('direct_messages')
      .insert(attachmentSchemaAvailable ? { ...messageValues, attachment_path: attachmentPath, voice_path: voicePath, voice_mime_type: voice?.type || null } : messageValues);
    const insertResult = attachmentSchemaAvailable
      ? await insertQuery
          .select('id, sender_profile_id, recipient_profile_id, content, attachment_path, voice_path, voice_mime_type, created_at, edited_at, edited_by')
          .maybeSingle()
      : await insertQuery
          .select('id, sender_profile_id, recipient_profile_id, content, created_at, edited_at, edited_by')
          .maybeSingle();
    const { data: inserted, error } = insertResult;

    if (error) {
      if (attachmentPath) {
        await supabase.storage.from('direct-message-images').remove([attachmentPath]);
      }
      if (voicePath) await supabase.storage.from('direct-message-audio').remove([voicePath]);
      throw error;
    }

    if (inserted?.id) {
      await notifyDirectMessage({
        recipientProfileId: peer.id,
        senderProfileId: me.id,
        messageId: inserted.id as string,
        preview: content || (voicePath ? '🎤 Messaggio vocale' : '📷 Foto'),
      });
    }

    return successResponse({
      message: inserted ? {
        ...inserted,
        attachment_url: (inserted as any).attachment_path ? `/api/direct-messages/attachment/${inserted.id}` : null,
        voice_url: (inserted as any).voice_path ? `/api/direct-messages/voice/${inserted.id}` : null,
        attachment_path: undefined,
        voice_path: undefined,
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
