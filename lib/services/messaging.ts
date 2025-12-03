'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type DirectThreadSummary = {
  otherProfileId: string;
  otherName: string;
  otherAvatarUrl: string | null;
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
  const res = await fetch('/api/direct-messages/threads', { cache: 'no-store' });
  const { json, rawText } = await parseResponse(res);
  if (!res.ok) {
    console.error('[messaging-service] inbox error', { status: res.status, body: json });
    throw new Error((json as any)?.error || rawText || 'Errore caricamento conversazioni');
  }
  const threads = Array.isArray((json as any)?.threads) ? (json as any).threads : [];
  return threads as DirectThreadSummary[];
}

export async function getDirectThread(targetProfileId: string): Promise<DirectMessageThread> {
  const target = ensureTargetProfileId(targetProfileId);
  const res = await fetch(`/api/direct-messages/${target}`, { cache: 'no-store' });
  const { json, rawText } = await parseResponse(res);
  if (!res.ok) {
    console.error('[messaging-service] thread error', { status: res.status, body: json, target });
    throw new Error((json as any)?.error || rawText || 'Errore caricamento messaggi');
  }

  return {
    messages: Array.isArray((json as any)?.messages) ? (json as any).messages : [],
    currentProfileId: typeof (json as any)?.currentProfileId === 'string' ? (json as any).currentProfileId : null,
    peer: (json as any)?.peer ?? null,
  } satisfies DirectMessageThread;
}

export async function sendDirectMessage(
  targetProfileId: string,
  payload: { text: string; attachmentUrl?: string | null },
): Promise<DirectMessage> {
  const target = ensureTargetProfileId(targetProfileId);
  const text = (payload?.text || '').trim();
  if (!text) throw new Error('contenuto mancante');

  const res = await fetch(`/api/direct-messages/${target}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text }),
  });
  const { json, rawText } = await parseResponse(res);
  if (!res.ok) {
    console.error('[messaging-service] send error', { status: res.status, body: json, target });
    throw new Error((json as any)?.error || rawText || 'Errore invio messaggio');
  }

  return ((json as any)?.message || null) as DirectMessage;
}

export async function markDirectThreadRead(targetProfileId: string): Promise<void> {
  const target = ensureTargetProfileId(targetProfileId);
  const res = await fetch(`/api/direct-messages/${target}/mark-read`, { method: 'POST' });
  if (!res.ok) {
    const { json, rawText } = await parseResponse(res);
    console.error('[messaging-service] mark-read error', { status: res.status, body: json, target });
    throw new Error((json as any)?.error || rawText || 'Errore aggiornamento lettura');
  }
}

export async function getUnreadConversationsCount(): Promise<number> {
  const res = await fetch('/api/direct-messages/unread-count', { cache: 'no-store' });
  const { json, rawText } = await parseResponse(res);
  if (!res.ok) {
    console.error('[messaging-service] unread-count error', { status: res.status, body: json });
    throw new Error((json as any)?.error || rawText || 'Errore lettura non letti');
  }
  return Number((json as any)?.unreadThreads) || 0;
}

export async function openDirectConversation(
  targetProfileId: string,
  opts?: { router?: AppRouterInstance; source?: string },
): Promise<string | void> {
  const target = ensureTargetProfileId(targetProfileId);
  const url = buildDirectConversationUrl(target);
  console.info('[messaging-service] openDirectConversation', { target, source: opts?.source });

  if (opts?.router) {
    opts.router.push(url);
    return;
  }

  return url;
}

export type { DirectThreadSummary, DirectMessage, DirectMessagePeer, DirectMessageThread };
