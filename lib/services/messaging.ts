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
  created_at: string;
  edited_at?: string | null;
  edited_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
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
};

async function parseResponse(res: Response) {
  const rawText = await res.text();
  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = rawText;
  }
  return { json, rawText };
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
    } satisfies DirectMessageThread;
  } catch (error: any) {
    console.error('[direct-messages] getDirectThread failed', { error, target });
    throw new Error(error?.message || 'Errore nel caricamento dei messaggi');
  }
}

export async function sendDirectMessage(
  targetProfileId: string,
  payload: { text: string; attachmentUrl?: string | null },
): Promise<DirectMessage> {
  const target = ensureTargetProfileId(targetProfileId);
  const text = (payload?.text || '').trim();
  if (!text) throw new Error('contenuto mancante');

  try {
    const res = await fetch(`/api/direct-messages/${target}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    const { json, rawText } = await parseResponse(res);
    if (!res.ok) {
      console.error('[direct-messages] sendDirectMessage failed', { status: res.status, body: json, target });
      throw new Error((json as any)?.error || rawText || 'Non è stato possibile inviare il messaggio');
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

export type { DirectThreadSummary, DirectMessage, DirectMessagePeer, DirectMessageThread };
