import { ConversationDetailResponse, MessageItem } from '@/types/messaging';

type StartConversationResponse = {
  ok: boolean;
  conversationId?: string;
  error?: string;
};

async function fetchConversationDetail(conversationId: string): Promise<ConversationDetailResponse> {
  console.log('[messaging-service] fetching conversation detail', { conversationId });
  const res = await fetch(`/api/messages/${conversationId}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({ ok: false, error: 'invalid_json' }));

  if (!res.ok || !json?.ok) {
    console.error('[messaging-service] fetch conversation detail error', { status: res.status, body: json });
    throw new Error(typeof json?.error === 'string' ? json.error : 'conversation_fetch_error');
  }

  console.log('[messaging-service] conversation detail loaded', {
    conversationId,
    messages: Array.isArray(json?.messages) ? json.messages.length : 0,
  });

  return json as ConversationDetailResponse;
}

export async function openConversation(targetProfileId: string): Promise<ConversationDetailResponse> {
  console.log('[messaging-service] openConversation start', { targetProfileId });
  const res = await fetch(`/api/messages/start?to=${encodeURIComponent(targetProfileId)}`, { cache: 'no-store' });
  const json = (await res.json().catch(() => ({ ok: false, error: 'invalid_json' }))) as StartConversationResponse;

  if (!res.ok || !json?.ok || !json.conversationId) {
    console.error('[messaging-service] openConversation error', { status: res.status, body: json });
    throw new Error(typeof json?.error === 'string' ? json.error : 'conversation_start_error');
  }

  return fetchConversationDetail(json.conversationId);
}

export async function sendMessage(conversationId: string, content: string): Promise<MessageItem> {
  console.log('[messaging-service] sendMessage start', { conversationId, contentLength: content?.length ?? 0 });

  const res = await fetch(`/api/messages/${conversationId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: content }),
  });

  const json = await res.json().catch(() => ({ ok: false, error: 'invalid_json' }));

  if (!res.ok || !json?.ok || !json?.message) {
    console.error('[messaging-service] sendMessage error', { status: res.status, body: json });
    throw new Error(typeof json?.error === 'string' ? json.error : 'message_send_error');
  }

  console.log('[messaging-service] sendMessage success', { conversationId, messageId: json.message.id });
  return json.message as MessageItem;
}

export { fetchConversationDetail };
