'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMessaging } from '@/components/messaging/MessagingProvider';
import { useToast } from '@/components/common/ToastProvider';
import type { ConversationPreview, MessageItem } from '@/lib/services/messaging';

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function avatarSrc(name?: string | null, url?: string | null) {
  if (url) return url;
  const seed = encodeURIComponent(name || 'Profilo');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}

function ConversationItem({
  item,
  active,
  onSelect,
}: {
  item: ConversationPreview;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const peer = item.peer;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`w-full rounded-lg border p-3 text-left transition ${
        active ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm' : 'border-neutral-200 hover:border-[var(--brand)] hover:bg-[var(--brand)]/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={avatarSrc(peer?.display_name, peer?.avatar_url)}
          alt={peer?.display_name || 'Profilo'}
          className="h-10 w-10 rounded-full border object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-semibold">{peer?.display_name || 'Profilo'}</div>
            <div className="text-xs text-neutral-500">{formatDate(item.last_message_at)}</div>
          </div>
          <div className="truncate text-sm text-neutral-600">{item.last_message_preview || 'Nessun messaggio'}</div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, me }: { message: MessageItem; me: string | null }) {
  const mine = me ? message.sender_profile_id === me : false;
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
          mine ? 'rounded-br-sm border-[var(--brand)] bg-[var(--brand)]/10' : 'border-neutral-200 bg-white'
        }`}
      >
        <div className="text-[11px] uppercase tracking-wide text-neutral-500">{formatDate(message.created_at)}</div>
        <div className="whitespace-pre-wrap text-neutral-900">{message.content}</div>
      </div>
    </div>
  );
}

export default function MessagesClient({
  initialConversationId,
  initialTargetProfileId,
}: {
  initialConversationId?: string | null;
  initialTargetProfileId?: string | null;
}) {
  const router = useRouter();
  const { show } = useToast();
  const {
    conversations,
    currentProfileId,
    activeConversationId,
    messages,
    drafts,
    loadingList,
    loadingThread,
    isSending,
    refresh,
    selectConversation,
    openConversationWithProfile,
    sendMessage,
    setDraft,
  } = useMessaging();

  const thread = useMemo(
    () => (activeConversationId ? messages[activeConversationId] ?? [] : []),
    [messages, activeConversationId]
  );
  const draft = useMemo(
    () => (activeConversationId ? drafts[activeConversationId] ?? '' : ''),
    [activeConversationId, drafts]
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (initialConversationId) {
          await selectConversation(initialConversationId);
          router.replace(`/messages?conversation=${initialConversationId}`);
          return;
        }
        if (initialTargetProfileId) {
          const createdId = await openConversationWithProfile(initialTargetProfileId);
          if (createdId) {
            router.replace(`/messages?conversation=${createdId}`);
          }
          return;
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error('[messages] apertura iniziale fallita', error);
          show(error?.message || 'Errore apertura conversazione', { variant: 'error' });
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [
    initialConversationId,
    initialTargetProfileId,
    openConversationWithProfile,
    router,
    selectConversation,
    show,
  ]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      void selectConversation(conversations[0].id);
    }
  }, [activeConversationId, conversations, selectConversation]);

  useEffect(() => {
    if (activeConversationId) {
      router.replace(`/messages?conversation=${activeConversationId}`);
    }
  }, [activeConversationId, router]);

  const handleSelect = (id: string) => {
    void selectConversation(id);
  };

  const handleSend = async () => {
    if (!activeConversationId || !draft.trim() || isSending) return;
    try {
      await sendMessage(activeConversationId, draft);
    } catch (error: any) {
      console.error('[messages] errore invio', error);
      show(error?.message || 'Errore invio messaggio', { variant: 'error' });
    }
  };

  const handleDraftChange = (value: string) => {
    if (!activeConversationId) return;
    setDraft(activeConversationId, value);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[340px,1fr]">
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Conversazioni</h1>
          <button
            type="button"
            onClick={() => refresh()}
            className="text-sm text-[var(--brand)] hover:underline"
          >
            Aggiorna
          </button>
        </div>
        {loadingList ? <div className="text-sm text-neutral-500">Caricamento…</div> : null}
        <div className="space-y-2">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              item={conv}
              active={conv.id === activeConversationId}
              onSelect={handleSelect}
            />
          ))}
          {conversations.length === 0 && !loadingList && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-600">
              Nessuna conversazione. Aprine una da un profilo.
            </div>
          )}
        </div>
      </aside>

      <section className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm">
        {loadingThread && <div className="text-sm text-neutral-500">Caricamento thread…</div>}
        {activeConversationId ? (
          <>
            <div className="flex items-center justify-between border-b pb-2">
              <div className="font-semibold text-neutral-900">Thread</div>
              <Link href="/network" className="text-sm text-[var(--brand)] hover:underline">
                Vai alla rete
              </Link>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto border-b pb-3">
              {thread.map((msg) => (
                <MessageBubble key={msg.id} message={msg} me={currentProfileId} />
              ))}
              {thread.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-sm text-neutral-600">
                  Nessun messaggio ancora. Scrivi il primo.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                className="h-28 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                placeholder="Scrivi un messaggio"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || isSending}
                  className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? 'Invio…' : 'Invia'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-600">
            Seleziona o apri una conversazione.
          </div>
        )}
      </section>
    </div>
  );
}
