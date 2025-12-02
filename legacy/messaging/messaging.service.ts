'use client';

export type PeerProfile = {
  id: string;
  display_name: string | null;
  account_type: string | null;
  avatar_url: string | null;
};

export type ConversationPreview = {
  id: string;
  peer: PeerProfile | null;
  last_message_at: string | null;
  last_message_preview: string | null;
};

export type MessageItem = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  content: string;
  created_at: string;
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function fetchConversations(): Promise<{ conversations: ConversationPreview[]; currentProfileId: string | null }> {
  const res = await fetch('/api/conversations', { cache: 'no-store' });
  const json = await parseJson(res);
  if (!res.ok) {
    console.error('[messaging-service] conversations error', json);
    throw new Error(json?.error || 'Errore caricamento conversazioni');
  }
  return {
    conversations: Array.isArray((json as any)?.conversations) ? (json as any).conversations : [],
    currentProfileId: (json as any)?.currentProfileId || null,
  };
}

export async function startConversation(targetProfileId: string): Promise<{ conversationId: string; peer: PeerProfile | null; currentProfileId: string | null }> {
  const target = (targetProfileId || '').trim();
  if (!target) throw new Error('targetProfileId mancante');

  const res = await fetch('/api/conversations/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetProfileId: target }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    console.error('[messaging-service] start error', json);
    throw new Error(json?.error || 'Errore apertura conversazione');
  }
  return {
    conversationId: (json as any)?.conversationId,
    peer: (json as any)?.peer ?? null,
    currentProfileId: (json as any)?.currentProfileId ?? null,
  };
}

export async function fetchMessages(conversationId: string): Promise<MessageItem[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: 'no-store' });
  const json = await parseJson(res);
  if (!res.ok) {
    console.error('[messaging-service] load messages error', json);
    throw new Error(json?.error || 'Errore caricamento messaggi');
  }
  return Array.isArray((json as any)?.messages) ? (json as any).messages : [];
}

export async function sendMessage(conversationId: string, content: string): Promise<MessageItem> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    console.error('[messaging-service] send error', json);
    throw new Error(json?.error || 'Errore invio messaggio');
  }
  return (json as any)?.message as MessageItem;
}
