'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const [count, setCount] = useState(initialCount);
  const lastExpandRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

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
      setError(msg === 'db_error' ? 'Impossibile caricare i commenti, riprova.' : msg);
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
      } else if (msg === 'db_error') {
        setError('Impossibile pubblicare il commento, riprova.');
      } else {
        setError(msg);
      }
    }
  }

  const displayed = expanded ? comments : preview;

  return (
    <div className="mt-3 space-y-2">
      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      {displayed.map((c) => {
        const author = c.author;
        const name = author?.display_name || author?.full_name || 'Utente';
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

      {!expanded && remaining > 0 ? (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={openComments}
        >
          Mostra altri {remaining} commenti
        </button>
      ) : null}

      {expanded ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={`comment-${postId}`} className="text-xs font-semibold text-neutral-700">
              Aggiungi un commento
            </label>
            <textarea
              id={`comment-${postId}`}
              ref={inputRef}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              placeholder="Scrivi un commento..."
            />
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
      ) : (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={openComments}
        >
          Aggiungi un commento
        </button>
      )}

      {loading ? <div className="text-sm text-neutral-500">Caricamento commenti…</div> : null}
    </div>
  );
}
