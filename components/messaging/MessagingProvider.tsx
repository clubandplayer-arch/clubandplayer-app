'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  fetchConversationDetail,
  fetchConversations,
  openConversation,
  sendMessage as sendMessageRequest,
} from '@/lib/services/messaging';
import {
  ConversationDetailResponse,
  ConversationSummary,
  MessageItem,
  ProfileSummary,
} from '@/types/messaging';

type MessagesMap = Record<string, MessageItem[]>;

type MessagingContextValue = {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messagesByConversation: MessagesMap;
  me: ProfileSummary | null;
  loadingList: boolean;
  loadingThread: boolean;
  isSending: (conversationId: string) => boolean;
  refreshConversations: () => Promise<void>;
  selectConversation: (conversationId: string | null) => Promise<void>;
  openConversationWithProfile: (targetProfileId: string, opts?: { activate?: boolean }) => Promise<string | null>;
  sendMessage: (conversationId: string, content: string) => Promise<MessageItem | null>;
};

const MessagingContext = createContext<MessagingContextValue | undefined>(undefined);

function upsertConversation(
  list: ConversationSummary[],
  incoming: ConversationSummary | null | undefined
): ConversationSummary[] {
  if (!incoming?.id) return list;
  const exists = list.findIndex((c) => c.id === incoming.id);
  if (exists === -1) return [...list, incoming];
  const next = [...list];
  next[exists] = { ...next[exists], ...incoming };
  return next;
}

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<MessagesMap>({});
  const [me, setMe] = useState<ProfileSummary | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [pendingSend, setPendingSend] = useState<Set<string>>(new Set());

  const isSending = useCallback(
    (conversationId: string) => pendingSend.has(conversationId),
    [pendingSend]
  );

  const refreshConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      console.log('[messaging-provider] refresh conversations');
      const json = await fetchConversations();
      setConversations(Array.isArray(json.data) ? json.data : []);
      setMe(json.me ?? null);
    } catch (error) {
      console.error('[messaging-provider] refresh conversations error', error);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const applyThread = useCallback((conversationId: string, messages: MessageItem[]) => {
    setMessagesByConversation((prev) => ({ ...prev, [conversationId]: messages }));
  }, []);

  const hydrateFromDetail = useCallback(
    (detail: ConversationDetailResponse) => {
      setMe(detail.me ?? null);
      setConversations((prev) => upsertConversation(prev, detail.conversation));
      applyThread(detail.conversation.id, detail.messages ?? []);
      return detail.conversation.id;
    },
    [applyThread]
  );

  const selectConversation = useCallback(
    async (conversationId: string | null) => {
      setActiveConversationId(conversationId);
      if (!conversationId) return;
      setLoadingThread(true);
      try {
        console.log('[messaging-provider] load conversation', { conversationId });
        const detail = await fetchConversationDetail(conversationId);
        hydrateFromDetail(detail);
      } catch (error) {
        console.error('[messaging-provider] load conversation error', { conversationId, error });
        setMessagesByConversation((prev) => ({ ...prev, [conversationId]: [] }));
      } finally {
        setLoadingThread(false);
      }
    },
    [hydrateFromDetail]
  );

  const openConversationWithProfile = useCallback(
    async (targetProfileId: string, opts?: { activate?: boolean }) => {
      const target = (targetProfileId || '').trim();
      if (!target) return null;
      console.log('[messaging-provider] open conversation with profile', { target });
      setLoadingThread(true);
      try {
        const detail = await openConversation(target);
        const conversationId = hydrateFromDetail(detail);
        if (opts?.activate !== false) setActiveConversationId(conversationId);
        return conversationId;
      } catch (error) {
        console.error('[messaging-provider] open conversation error', { target, error });
        throw error;
      } finally {
        setLoadingThread(false);
      }
    },
    [hydrateFromDetail]
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      const cleanContent = (content || '').trim();
      if (!conversationId || !cleanContent) return null;
      console.log('[messaging-provider] send message', {
        conversationId,
        contentLength: cleanContent.length,
      });

      const optimistic: MessageItem = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        body: cleanContent,
        sender_id: null,
        sender_profile_id: me?.id ?? null,
        created_at: new Date().toISOString(),
      };

      setPendingSend((prev) => new Set(prev).add(conversationId));
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), optimistic],
      }));

      try {
        const saved = await sendMessageRequest(conversationId, cleanContent);
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === optimistic.id ? saved : m
          ),
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  last_message_preview: saved.body,
                  last_message_at: saved.created_at,
                }
              : c
          )
        );
        return saved;
      } catch (error) {
        console.error('[messaging-provider] send message error', { conversationId, error });
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).filter((m) => m.id !== optimistic.id),
        }));
        throw error;
      } finally {
        setPendingSend((prev) => {
          const next = new Set(prev);
          next.delete(conversationId);
          return next;
        });
      }
    },
    [me]
  );

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const value = useMemo<MessagingContextValue>(() => ({
    conversations,
    activeConversationId,
    messagesByConversation,
    me,
    loadingList,
    loadingThread,
    isSending,
    refreshConversations,
    selectConversation,
    openConversationWithProfile,
    sendMessage,
  }), [
    conversations,
    activeConversationId,
    messagesByConversation,
    me,
    loadingList,
    loadingThread,
    isSending,
    refreshConversations,
    selectConversation,
    openConversationWithProfile,
    sendMessage,
  ]);

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging(): MessagingContextValue {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging deve essere usato dentro MessagingProvider');
  return ctx;
}
