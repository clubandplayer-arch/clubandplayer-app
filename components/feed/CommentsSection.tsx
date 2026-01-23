'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from '@/components/feed/EmojiPicker';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import { buildProfileDisplayName } from '@/lib/displayName';

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
  currentUserId?: string | null;
};

export function CommentsSection({ postId, initialCount = 0, onCountChange, expandSignal, currentUserId }: Props) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBody, setNewBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiPopoverRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
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
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!emojiOpen || !isDesktop) return;
    const button = emojiButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const popoverHeight = 360;
    const viewportPadding = 16;
    const top = Math.min(rect.bottom + 8, window.innerHeight - popoverHeight - viewportPadding);
    const left = Math.min(rect.right, window.innerWidth - viewportPadding);
    setPopoverStyle({ top, left });
  }, [emojiOpen, isDesktop]);

  useEffect(() => {
    if (!emojiOpen || !isDesktop) return;
    function handleScroll() {
      setEmojiOpen(false);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [emojiOpen, isDesktop]);

  useEffect(() => {
    if (!emojiOpen || isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [emojiOpen, isDesktop]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const preview = useMemo(() => comments.slice(0, 2), [comments]);
  const remaining = Math.max(0, count - preview.length);

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

  const startEdit = useCallback((comment: PostComment) => {
    setEditingId(comment.id);
    setDraftText(comment.body ?? '');
    setEditError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraftText('');
    setEditError(null);
  }, []);

  const saveEdit = useCallback(
    async (commentId: string) => {
      const payload = draftText.trim();
      if (!payload) {
        setEditError('Il commento non può essere vuoto.');
        return;
      }
      setEditSaving(true);
      setEditError(null);
      try {
        const res = await fetch(`/api/feed/comments/${commentId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: payload }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok || !json?.comment) {
          throw new Error(json?.error || json?.message || 'Impossibile aggiornare il commento');
        }
        setComments((curr) =>
          curr.map((item) =>
            item.id === commentId ? { ...item, ...json.comment, author: item.author } : item,
          ),
        );
        setEditingId(null);
        setDraftText('');
      } catch (e: any) {
        const msg = String(e?.message || 'Errore');
        if (msg === 'EDIT_WINDOW_EXPIRED') {
          setEditError('Tempo per la modifica scaduto.');
          setEditingId(null);
        } else if (msg.toLowerCase().includes('autentic')) {
          setError('Accedi per modificare il commento.');
        } else {
          setEditError(msg);
        }
      } finally {
        setEditSaving(false);
      }
    },
    [draftText],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const confirmed = window.confirm('Vuoi eliminare questo commento?');
      if (!confirmed) return;
      setDeleteError(null);
      try {
        const res = await fetch(`/api/feed/comments/${commentId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || json?.message || 'Impossibile eliminare il commento');
        }
        setComments((curr) => curr.filter((item) => item.id !== commentId));
        setCount((c) => {
          const next = Math.max(0, c - 1);
          onCountChange?.(next);
          return next;
        });
        if (editingId === commentId) {
          setEditingId(null);
          setDraftText('');
        }
      } catch (e: any) {
        const msg = String(e?.message || 'Errore');
        if (msg.toLowerCase().includes('autentic')) {
          setError('Accedi per eliminare il commento.');
        } else {
          setDeleteError(msg);
        }
      }
    },
    [editingId, onCountChange],
  );

  const displayed = expanded ? comments : preview;
  const emojiPickerContent = (
    <EmojiPicker
      onSelect={(emoji) => {
        insertEmoji(emoji);
        setEmojiOpen(false);
      }}
      onClose={() => setEmojiOpen(false)}
    />
  );

  const emojiPicker = isDesktop ? (
    <div
      ref={emojiPopoverRef}
      className="fixed z-[9999] w-[340px] rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl"
      style={{
        ...popoverStyle,
        transform: 'translateX(-100%)',
      }}
    >
      <div className="h-[360px] overflow-hidden">{emojiPickerContent}</div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/30"
        aria-label="Chiudi emoji picker"
        onClick={() => setEmojiOpen(false)}
      />
      <div
        ref={emojiPopoverRef}
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-neutral-200 bg-white p-4 shadow-2xl"
      >
        <div className="h-[60vh] overflow-hidden">{emojiPickerContent}</div>
      </div>
    </div>
  );

  return (
    <div className="mt-3 space-y-2">
      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      {displayed.map((c) => {
        const author = c.author;
        const name = buildProfileDisplayName(author?.full_name, author?.display_name, 'Profilo');
        const createdAt = c.created_at ? new Date(c.created_at).getTime() : null;
        const ageMs = createdAt ? now - createdAt : null;
        const isOwner = Boolean(currentUserId && c.author_id === currentUserId);
        const canEdit = Boolean(isOwner && ageMs !== null && ageMs <= 60_000);
        const canDelete = isOwner;
        const isEditing = editingId === c.id;
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
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand)]/90 disabled:opacity-60"
                    onClick={() => saveEdit(c.id)}
                    disabled={editSaving}
                  >
                    Salva
                  </button>
                  <button type="button" className="text-sm text-neutral-600 underline" onClick={cancelEdit}>
                    Annulla
                  </button>
                </div>
                {editError ? <div className="text-xs text-red-600">{editError}</div> : null}
              </div>
            ) : (
              <>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{c.body}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                  {c.created_at ? (
                    <span>
                      {new Intl.DateTimeFormat('it-IT', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(c.created_at))}
                    </span>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      className="font-semibold text-[var(--brand)] hover:underline"
                      onClick={() => startEdit(c)}
                    >
                      Modifica
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className="font-semibold text-red-600 hover:underline"
                      onClick={() => deleteComment(c.id)}
                    >
                      Elimina
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        );
      })}

      {deleteError ? <div className="text-xs text-red-600">{deleteError}</div> : null}

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
