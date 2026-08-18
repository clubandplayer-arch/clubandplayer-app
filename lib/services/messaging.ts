'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type DirectThreadSummary = {
  otherProfileId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  other?: {
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    account_type: string | null;
  };
  lastMessage: string;
  lastMessageAt: string;
  hasUnread?: boolean;
};

type DirectMessage = {
  id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  content: string;
  attachment_url?: string | null;
  voice_url?: string | null;
  voice_mime_type?: string | null;
  reactions?: DirectMessageReaction[];
  created_at: string;
  edited_at?: string | null;
  edited_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type DirectMessageReaction = {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
};

type DirectMessagePeer = {
  id: string;
  display_name: string | null;
  account_type: string | null;
  avatar_url: string | null;
};

type DirectMessageThread = {
  messages: DirectMessage[];
  currentProfileId: string | null;
  peer?: DirectMessagePeer | null;
  peerOnline: boolean | null;
  peerLastReadAt: string | null;
};

async function parseResponse(res: Response) {
  const rawText = await res.text();
  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = rawText;
  }
  // A platform-level 500 can return a complete HTML error page. Never surface
  // that document inside the chat UI as an error message.
  const safeRawText = /^\s*<!doctype html/i.test(rawText) || /^\s*<html/i.test(rawText) ? '' : rawText;
  return { json, rawText: safeRawText };
}

function ensureTargetProfileId(targetProfileId: string) {
  const target = (targetProfileId || '').trim();
  if (!target) throw new Error('targetProfileId mancante');
  return target;
}

export function buildDirectConversationUrl(targetProfileId: string) {
  const target = ensureTargetProfileId(targetProfileId);
  return `/messages/${target}`;
}

export async function getDirectInbox(): Promise<DirectThreadSummary[]> {
  try {
    const res = await fetch('/api/direct-messages/threads', { cache: 'no-store' });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] getDirectInbox failed', { status: res.status, body: json });
      throw new Error((json as any)?.error || rawText || 'Errore nel caricamento delle conversazioni');
    }
    const threads = Array.isArray((json as any)?.threads) ? (json as any).threads : [];
    return threads as DirectThreadSummary[];
  } catch (error: any) {
    console.error('[direct-messages] getDirectInbox failed', { error });
    throw new Error(error?.message || 'Errore nel caricamento delle conversazioni');
  }
}

export async function getDirectThread(targetProfileId: string): Promise<DirectMessageThread> {
  const target = ensureTargetProfileId(targetProfileId);
  try {
    const res = await fetch(`/api/direct-messages/${target}`, { cache: 'no-store' });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] getDirectThread failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.error || rawText || 'Errore nel caricamento dei messaggi');
    }

    return {
      messages: Array.isArray((json as any)?.messages) ? (json as any).messages : [],
      currentProfileId: typeof (json as any)?.currentProfileId === 'string' ? (json as any).currentProfileId : null,
      peer: (json as any)?.peer ?? null,
      peerOnline: typeof (json as any)?.peerOnline === 'boolean' ? (json as any).peerOnline : null,
      peerLastReadAt: typeof (json as any)?.peerLastReadAt === 'string' ? (json as any).peerLastReadAt : null,
    } satisfies DirectMessageThread;
  } catch (error: any) {
    console.error('[direct-messages] getDirectThread failed', { error, target });
    throw new Error(error?.message || 'Errore nel caricamento dei messaggi');
  }
}

export async function sendDirectMessage(
  targetProfileId: string,
  payload: { text?: string; attachment?: File | null; voice?: File | null },
): Promise<DirectMessage> {
  const target = ensureTargetProfileId(targetProfileId);
  const text = (payload?.text || '').trim();
  if (!text && !payload?.attachment && !payload?.voice) throw new Error('contenuto mancante');

  try {
    const formData = new FormData();
    formData.set('content', text);
    if (payload.attachment) formData.set('attachment', payload.attachment);
    if (payload.voice) formData.set('voice', payload.voice);
    const res = await fetch(`/api/direct-messages/${target}`, {
      method: 'POST',
      body: formData,
    });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] sendDirectMessage failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.message || (json as any)?.error || rawText || 'Non è stato possibile inviare il messaggio');
    }

    return ((json as any)?.message || null) as DirectMessage;
  } catch (error: any) {
    console.error('[direct-messages] sendDirectMessage failed', { error, target });
    throw new Error(error?.message || 'Non è stato possibile inviare il messaggio');
  }
}

export async function updateDirectMessage(messageId: string, content: string): Promise<DirectMessage> {
  const target = (messageId || '').trim();
  const text = (content || '').trim();
  if (!target) throw new Error('messageId mancante');
  if (!text) throw new Error('contenuto mancante');

  try {
    const res = await fetch(`/api/direct-messages/message/${target}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] updateDirectMessage failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.message || rawText || 'Non è stato possibile modificare il messaggio');
    }

    return ((json as any)?.message || null) as DirectMessage;
  } catch (error: any) {
    console.error('[direct-messages] updateDirectMessage failed', { error, target });
    throw new Error(error?.message || 'Non è stato possibile modificare il messaggio');
  }
}

export async function deleteDirectMessage(messageId: string): Promise<string> {
  const target = (messageId || '').trim();
  if (!target) throw new Error('messageId mancante');

  try {
    const res = await fetch(`/api/direct-messages/message/${target}`, { method: 'DELETE' });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] deleteDirectMessage failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.message || rawText || 'Non è stato possibile eliminare il messaggio');
    }

    const id = (json as any)?.messageId || target;
    return String(id);
  } catch (error: any) {
    console.error('[direct-messages] deleteDirectMessage failed', { error, target });
    throw new Error(error?.message || 'Non è stato possibile eliminare il messaggio');
  }
}

export async function setDirectMessageReaction(messageId: string, emoji: string): Promise<void> {
  const res = await fetch(`/api/direct-messages/message/${messageId}/reaction`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
  });
  const { json, rawText } = await parseResponse(res);
  if (!res.ok) throw new Error((json as any)?.message || rawText || 'Reazione non riuscita');
}

export async function removeDirectMessageReaction(messageId: string): Promise<void> {
  const res = await fetch(`/api/direct-messages/message/${messageId}/reaction`, { method: 'DELETE' });
  const { json, rawText } = await parseResponse(res);
  if (!res.ok) throw new Error((json as any)?.message || rawText || 'Rimozione reazione non riuscita');
}

export async function deleteDirectConversation(targetProfileId: string): Promise<void> {
  const target = ensureTargetProfileId(targetProfileId);
  try {
    const res = await fetch(`/api/direct-messages/conversation/${target}`, { method: 'DELETE' });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] deleteDirectConversation failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.message || rawText || 'Non è stato possibile cancellare la chat');
    }
  } catch (error: any) {
    console.error('[direct-messages] deleteDirectConversation failed', { error, target });
    throw new Error(error?.message || 'Non è stato possibile cancellare la chat');
  }
}

export async function markDirectThreadRead(targetProfileId: string): Promise<void> {
  const target = ensureTargetProfileId(targetProfileId);
  try {
    const res = await fetch(`/api/direct-messages/${target}/mark-read`, { method: 'POST' });
    if (!res.ok) {
      const { json, rawText } = await parseResponse(res);
      console.error('[direct-messages] markDirectThreadRead failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.error || rawText || 'Errore nell’aggiornamento di lettura');
    }
  } catch (error: any) {
    console.error('[direct-messages] markDirectThreadRead failed', { error, target });
    throw new Error(error?.message || 'Errore nell’aggiornamento di lettura');
  }
}

export async function getUnreadConversationsCount(): Promise<number> {
  try {
    const res = await fetch('/api/direct-messages/unread-count', { cache: 'no-store' });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] getUnreadConversationsCount failed', { status: res.status, body: json });
      throw new Error((json as any)?.error || rawText || 'Errore nel conteggio dei non letti');
    }
    return Number((json as any)?.unreadThreads) || 0;
  } catch (error: any) {
    console.error('[direct-messages] getUnreadConversationsCount failed', { error });
    throw new Error(error?.message || 'Errore nel conteggio dei non letti');
  }
}

export async function openDirectConversation(
  targetProfileId: string,
  opts?: { router?: AppRouterInstance; source?: string },
): Promise<string | void> {
  const target = ensureTargetProfileId(targetProfileId);
  const url = buildDirectConversationUrl(target);
  console.log('[direct-messages] openDirectConversation', { target, source: opts?.source });

  if (opts?.router) {
    opts.router.push(url);
    return;
  }

  return url;
}

export type { DirectThreadSummary, DirectMessage, DirectMessageReaction, DirectMessagePeer, DirectMessageThread };
