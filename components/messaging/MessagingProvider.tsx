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
  type ConversationPreview,
  type MessageItem,
  fetchConversations,
  fetchMessages,
  sendMessage as apiSendMessage,
  startConversation,
} from '@/lib/services/messaging';

export type MessagingContextValue = {
  conversations: ConversationPreview[];
  currentProfileId: string | null;
  activeConversationId: string | null;
  messages: Record<string, MessageItem[]>;
  drafts: Record<string, string>;
  loadingList: boolean;
  loadingThread: boolean;
  isSending: boolean;
  refresh: () => Promise<void>;
  openConversationWithProfile: (targetProfileId: string) => Promise<string | null>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<MessageItem | null>;
  setDraft: (conversationId: string, value: string) => void;
};

const MessagingContext = createContext<MessagingContextValue | undefined>(undefined);

function mapMessages(values: MessageItem[] | null | undefined) {
  return Array.isArray(values) ? values : [];
}

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetchConversations();
      setConversations(res.conversations || []);
      setCurrentProfileId(res.currentProfileId || null);
    } catch (error) {
      console.error('[messaging-provider] refresh error', error);
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDraft = useCallback((conversationId: string, value: string) => {
    if (!conversationId) return;
    setDrafts((prev) => ({ ...prev, [conversationId]: value }));
  }, []);

  const selectConversation = useCallback(async (conversationId: string) => {
    const id = (conversationId || '').trim();
    if (!id) return;
    setActiveConversationId(id);
    setLoadingThread(true);
    try {
      const items = await fetchMessages(id);
      setMessages((prev) => ({ ...prev, [id]: mapMessages(items) }));
    } catch (error) {
      console.error('[messaging-provider] load messages error', error);
      setMessages((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const openConversationWithProfile = useCallback(
    async (targetProfileId: string) => {
      const target = (targetProfileId || '').trim();
      if (!target) return null;
      setLoadingThread(true);
      try {
        const res = await startConversation(target);
        if (!res.conversationId) throw new Error('conversationId mancante');
        setCurrentProfileId(res.currentProfileId || null);

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.conversationId);
          if (exists && res.peer) {
            return prev.map((c) => (c.id === res.conversationId ? { ...c, peer: res.peer } : c));
          }
          if (exists) return prev;
          return [
            {
              id: res.conversationId,
              peer: res.peer ?? null,
              last_message_at: null,
              last_message_preview: null,
            },
            ...prev,
          ];
        });

        setMessages((prev) => ({ ...prev, [res.conversationId]: prev[res.conversationId] ?? [] }));
        setActiveConversationId(res.conversationId);
        await selectConversation(res.conversationId);
        return res.conversationId;
      } catch (error) {
        console.error('[messaging-provider] open conversation error', error);
        throw error;
      } finally {
        setLoadingThread(false);
      }
    },
    [selectConversation],
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      const clean = (content || '').trim();
      if (!conversationId || !clean) return null;
      setSending(true);

      const optimistic: MessageItem = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_profile_id: currentProfileId || '',
        content: clean,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), optimistic],
      }));
      setDrafts((prev) => ({ ...prev, [conversationId]: '' }));

      try {
        const saved = await apiSendMessage(conversationId, clean);
        setMessages((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []).filter((m) => !m.id.startsWith('temp-')), saved],
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, last_message_at: saved.created_at, last_message_preview: saved.content }
              : c,
          ),
        );
        return saved;
      } catch (error) {
        console.error('[messaging-provider] send error', error);
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).filter((m) => !m.id.startsWith('temp-')),
        }));
        throw error;
      } finally {
        setSending(false);
      }
    },
    [currentProfileId],
  );

  const value = useMemo<MessagingContextValue>(
    () => ({
      conversations,
      currentProfileId,
      activeConversationId,
      messages,
      drafts,
      loadingList,
      loadingThread,
      isSending: sending,
      refresh,
      openConversationWithProfile,
      selectConversation,
      sendMessage,
      setDraft,
    }),
    [
      activeConversationId,
      conversations,
      currentProfileId,
      drafts,
      loadingList,
      loadingThread,
      messages,
      openConversationWithProfile,
      refresh,
      selectConversation,
      sendMessage,
      sending,
      setDraft,
    ],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging(): MessagingContextValue {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging deve essere usato dentro MessagingProvider');
  return ctx;
}
