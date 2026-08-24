'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildProfileDisplayName } from '@/lib/displayName';
import CertifiedCMarkSidebar from '@/components/badges/CertifiedCMarkSidebar';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MentionText, renderMentionText } from '@/components/feed/MentionText';
import { useI18n } from '@/components/i18n/I18nProvider';
import { formatDate } from '@/lib/i18n/format';

export type CommentAuthor = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
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

type MentionFollowerOption = {
  id: string;
  label: string;
  mention: string;
  avatarUrl: string | null;
};

function normalizeMentionToken(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function findMentionQuery(value: string, caret: number | null) {
  if (caret == null) return null;
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(/(^|\s)@([\p{L}\p{N}_.-]{0,64})$/u);
  if (!match) return null;
  return {
    start: beforeCaret.length - (match[2]?.length ?? 0) - 1,
    query: match[2] ?? '',
  };
}

export function CommentsSection({ postId, initialCount = 0, onCountChange, expandSignal, currentUserId }: Props) {
  const { locale, t } = useI18n();
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
  const [followers, setFollowers] = useState<MentionFollowerOption[]>([]);
  const [commentCaretPosition, setCommentCaretPosition] = useState<number | null>(null);
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [count, setCount] = useState(initialCount);
  const lastExpandRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const preview = useMemo(() => comments.slice(0, 2), [comments]);
  const remaining = Math.max(0, count - preview.length);
  const mentionQuery = findMentionQuery(newBody, commentCaretPosition);
  const mentionSuggestions =
    mentionQuery && mentionQuery.query.length >= 2
      ? followers
          .filter((follower) => follower.mention.includes(normalizeMentionToken(mentionQuery.query)))
          .slice(0, 6)
      : [];

  useEffect(() => {
    if (!expanded || followers.length) return;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!profile?.id) return;

        const { data, error } = await supabase
          .from('follows')
          .select('follower:profiles!follows_follower_profile_id_fkey(id, display_name, full_name, avatar_url, status)')
          .eq('target_profile_id', profile.id)
          .limit(200);

        if (error) {
          console.warn('[CommentsSection] follower mention lookup failed', { message: error.message });
          return;
        }

        const options = (data ?? [])
          .map((row: any) => row?.follower)
          .filter((follower: any) => follower?.id && follower?.status === 'active')
          .map((follower: any): MentionFollowerOption | null => {
            const label = String(follower.display_name || follower.full_name || '').trim();
            const mention = normalizeMentionToken(label).slice(0, 64);
            if (!label || !mention) return null;
            return {
              id: String(follower.id),
              label,
              mention,
              avatarUrl: follower.avatar_url ?? null,
            };
          })
          .filter(Boolean) as MentionFollowerOption[];

        setFollowers(Array.from(new Map(options.map((option) => [option.id, option])).values()));
      } catch (error: any) {
        console.warn('[CommentsSection] follower mention lookup failed', { message: error?.message });
      }
    })();
  }, [expanded, followers.length]);

  useEffect(() => {
    if (!mentionSuggestions.length) {
      setSuggestionPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSuggestionPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.min(288, rect.width),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [mentionSuggestions.length, newBody]);

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

  function selectMentionSuggestion(option: MentionFollowerOption) {
    if (!mentionQuery) return;
    const suffix = `@${option.mention} `;
    const next = `${newBody.slice(0, mentionQuery.start)}${suffix}${newBody.slice(commentCaretPosition ?? newBody.length)}`;
    const nextCaret = mentionQuery.start + suffix.length;
    setNewBody(next);
    setCommentCaretPosition(nextCaret);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

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
        const isCertified = author?.account_type === 'club' && Boolean(author?.is_verified);
        return (
          <div key={c.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-200">
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
                {isCertified ? (
                  <CertifiedCMarkSidebar className="absolute -top-2 -right-2 scale-[0.75]" />
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
                    {t('common.save')}
                  </button>
                  <button type="button" className="text-sm text-neutral-600 underline" onClick={cancelEdit}>
                    {t('common.cancel')}
                  </button>
                </div>
                {editError ? <div className="text-xs text-red-600">{editError}</div> : null}
              </div>
            ) : (
              <>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
                  <MentionText value={c.body} />
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                  {c.created_at ? (
                    <span>
                      {formatDate(new Date(c.created_at), locale, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      className="font-semibold text-[var(--brand)] hover:underline"
                      onClick={() => startEdit(c)}
                    >
                      {t('feed.edit')}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className="font-semibold text-red-600 hover:underline"
                      onClick={() => deleteComment(c.id)}
                    >
                      {t('feed.delete')}
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
        <div className="text-sm text-neutral-500">{t('feed.noComments')}</div>
      ) : null}

      {!expanded ? (
        <div className="flex flex-wrap items-center gap-3">
          {remaining > 0 ? (
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
              onClick={openComments}
            >
              {t('feed.showMoreComments', { count: remaining })}
            </button>
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
              onClick={openComments}
            >
              {t('feed.showComments')}
            </button>
          )}

          <button
            type="button"
            className="text-sm font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
            onClick={openComments}
          >
            {t('feed.addComment')}
          </button>
        </div>
      ) : expanded ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={`comment-${postId}`} className="text-xs font-semibold text-neutral-700">
              {t('feed.addComment')}
            </label>
            <div className="relative z-50">
              {newBody ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words rounded-lg border border-transparent p-2 text-sm leading-5 text-neutral-800"
                >
                  {renderMentionText(newBody)}
                </div>
              ) : null}
              <textarea
                id={`comment-${postId}`}
                ref={inputRef}
                value={newBody}
                onChange={(e) => {
                  setNewBody(e.target.value);
                  setCommentCaretPosition(e.currentTarget.selectionStart);
                }}
                onClick={(e) => setCommentCaretPosition(e.currentTarget.selectionStart)}
                onKeyUp={(e) => setCommentCaretPosition(e.currentTarget.selectionStart)}
                rows={3}
                className={`relative w-full rounded-lg border border-neutral-300 bg-transparent p-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                  newBody ? 'text-transparent caret-neutral-900' : ''
                }`}
                placeholder={t('feed.commentPlaceholder')}
              />
              {mentionSuggestions.length && suggestionPosition ? (
                <div
                  className="fixed z-[100000] overflow-hidden rounded-xl border border-sky-100 bg-white shadow-2xl"
                  style={{
                    top: suggestionPosition.top,
                    left: suggestionPosition.left,
                    width: suggestionPosition.width,
                  }}
                >
                  <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                    {t('feed.tagFollower')}
                  </div>
                  {mentionSuggestions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sky-50"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectMentionSuggestion(option);
                      }}
                    >
                      {option.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                          {option.label.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{option.label}</span>
                        <span className="block truncate text-xs text-sky-600">@{option.mention}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand)]/90"
                onClick={submitComment}
              >
                {t('feed.publish')}
              </button>
              <button
                type="button"
                className="text-sm text-neutral-600 underline"
                onClick={closeComments}
              >
                {t('feed.closeComments')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? <div className="text-sm text-neutral-500">{t('feed.loadingComments')}</div> : null}
    </div>
  );
}
