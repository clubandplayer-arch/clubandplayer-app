'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import { buildProfileDisplayName } from '@/lib/displayName';

const EMOJI_OPTIONS = [
  '😀',
  '😁',
  '😂',
  '🤣',
  '😊',
  '😍',
  '😘',
  '😎',
  '🤩',
  '😇',
  '😜',
  '🤪',
  '🤗',
  '🥳',
  '😴',
  '😮',
  '😢',
  '😭',
  '😤',
  '😡',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🙏',
  '💪',
  '👀',
  '🔥',
  '✨',
  '🎉',
  '🎯',
  '🏆',
  '⚽',
  '🏀',
  '🎵',
  '❤️',
  '💙',
  '💚',
  '💛',
  '💜',
  '🖤',
];

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, ref]);
}

export type CommentAuthor = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  status?: string | null;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at?: string | null;
  author?: CommentAuthor | null;
};

type Props = {
  postId: string;
  initialCount?: number;
  onCountChange?: (next: number) => void;
  expandSignal?: number;
};

export function CommentsSection({ postId, initialCount = 0, onCountChange, expandSignal }: Props) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBody, setNewBody] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiPopoverRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [count, setCount] = useState(initialCount);
  const lastExpandRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  useOutsideClick(emojiPopoverRef, () => setEmojiOpen(false));

  useEffect(() => {
    setMounted(true);
    setIsDesktop(window.innerWidth >= 640);
    function handleResize() {
      setIsDesktop(window.innerWidth >= 640);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!emojiOpen || !isDesktop) return;
    const button = emojiButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = rect.right;
    setPopoverStyle({ top, left });
  }, [emojiOpen, isDesktop]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const preview = useMemo(() => comments.slice(0, 2), [comments]);
  const remaining = Math.max(0, count - preview.length);
  const filteredEmojis = useMemo(() => {
    const query = emojiQuery.trim();
    if (!query) return EMOJI_OPTIONS;
    return EMOJI_OPTIONS.filter((emoji) => emoji.includes(query));
  }, [emojiQuery]);

  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/comments?postId=${encodeURIComponent(postId)}&limit=100`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Errore caricamento commenti');
      const items = Array.isArray(json.comments) ? json.comments : [];
      setComments(items);
      loadedRef.current = true;
    } catch (e: any) {
      const msg = String(e?.message || 'Errore commenti');
      if (msg === 'db_error') {
        setError('Impossibile caricare i commenti, riprova.');
      } else if (msg === 'comments_not_ready') {
        setError('Commenti non configurati, applicare la migrazione post_comments su Supabase.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, postId]);

  const openComments = useCallback(() => {
    setExpanded(true);
    void ensureLoaded();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [ensureLoaded]);

  useEffect(() => {
    if (typeof expandSignal === 'number' && expandSignal !== lastExpandRef.current) {
      lastExpandRef.current = expandSignal;
      if (expandSignal > 0) {
        openComments();
      }
    }
  }, [expandSignal, openComments]);

  const closeComments = useCallback(() => {
    setExpanded(false);
    setEmojiOpen(false);
    setEmojiQuery('');
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    setNewBody((prev) => `${prev.slice(0, start)}${emoji}${prev.slice(end)}`);
    requestAnimationFrame(() => {
      input.focus();
      const nextPos = start + emoji.length;
      input.setSelectionRange(nextPos, nextPos);
    });
  }, []);

  async function submitComment() {
    const payload = newBody.trim();
    if (!payload) return;
    setError(null);
    try {
      const res = await fetch('/api/feed/comments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, body: payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json.comment) {
        throw new Error(json?.error || 'Impossibile pubblicare commento');
      }
      setNewBody('');
      setEmojiQuery('');
      setEmojiOpen(false);
      setComments((curr) => [...curr, json.comment]);
      setCount((c) => {
        const next = c + 1;
        onCountChange?.(next);
        return next;
      });
      setExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e: any) {
      const msg = String(e?.message || 'Errore');
      if (msg.includes('not_authenticated')) {
        setError('Accedi per inserire un commento.');
      } else if (msg === 'comments_not_ready') {
        setError('Commenti non configurati, contatta l’amministratore.');
      } else if (msg === 'db_error') {
        setError('Impossibile pubblicare il commento, riprova.');
      } else {
        setError(msg);
      }
    }
  }

  const displayed = expanded ? comments : preview;
  const emojiPicker = (
    <div
      ref={emojiPopoverRef}
      className="fixed inset-x-0 bottom-0 z-[9999] max-h-[60vh] rounded-t-2xl border border-neutral-200 bg-white p-3 shadow-lg sm:inset-auto sm:bottom-auto sm:w-[320px] sm:max-h-[320px] sm:rounded-2xl sm:-translate-x-full"
      style={isDesktop ? popoverStyle : undefined}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={emojiQuery}
          onChange={(e) => setEmojiQuery(e.target.value)}
          placeholder="Cerca emoji"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <button
          type="button"
          className="text-xs font-semibold text-neutral-500"
          onClick={() => {
            setEmojiOpen(false);
            setEmojiQuery('');
          }}
        >
          Chiudi
        </button>
      </div>
      <div className="mt-3 grid max-h-[45vh] grid-cols-8 gap-2 overflow-y-auto text-lg sm:max-h-[220px] sm:grid-cols-7">
        {filteredEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100"
            onClick={() => {
              insertEmoji(emoji);
              setEmojiOpen(false);
            }}
          >
            {emoji}
          </button>
        ))}
        {filteredEmojis.length === 0 ? (
          <div className="col-span-full text-xs text-neutral-500">Nessuna emoji trovata</div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="mt-3 space-y-2">
      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      {displayed.map((c) => {
        const author = c.author;
        const name = buildProfileDisplayName(author?.full_name, author?.display_name, 'Profilo');
        return (
          <div key={c.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                {author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={author.avatar_url}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="text-sm font-semibold text-neutral-800">{name}</div>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{c.body}</p>
            {c.created_at ? (
              <div className="text-[10px] text-neutral-500">
                {new Intl.DateTimeFormat('it-IT', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(c.created_at))}
              </div>
            ) : null}
          </div>
        );
      })}

      {count === 0 && !loading ? (
        <div className="text-sm text-neutral-500">Nessun commento</div>
      ) : null}

      {!expanded ? (
        <div className="flex flex-wrap items-center gap-3">
          {remaining > 0 ? (
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
              onClick={openComments}
            >
              Mostra altri {remaining} commenti
            </button>
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
              onClick={openComments}
            >
              Mostra commenti
            </button>
          )}

          <button
            type="button"
            className="text-sm font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
            onClick={openComments}
          >
            Aggiungi un commento
          </button>
        </div>
      ) : expanded ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={`comment-${postId}`} className="text-xs font-semibold text-neutral-700">
              Aggiungi un commento
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id={`comment-${postId}`}
                ref={inputRef}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                placeholder="Scrivi un commento..."
              />
              <div className="relative">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                  onClick={() => setEmojiOpen((prev) => !prev)}
                  aria-expanded={emojiOpen}
                  aria-label="Aggiungi emoji"
                  ref={emojiButtonRef}
                >
                  <MaterialIcon name="sentiment_satisfied" fontSize="small" />
                </button>
                {emojiOpen && mounted ? createPortal(emojiPicker, document.body) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand)]/90"
                onClick={submitComment}
              >
                Pubblica
              </button>
              <button
                type="button"
                className="text-sm text-neutral-600 underline"
                onClick={closeComments}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? <div className="text-sm text-neutral-500">Caricamento commenti…</div> : null}
    </div>
  );
}
