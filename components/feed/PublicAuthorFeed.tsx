// components/feed/PublicAuthorFeed.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommentsSection } from '@/components/feed/CommentsSection';
import { PostMedia } from '@/components/feed/PostMedia';
import { getPostPermalink, shareOrCopyLink } from '@/lib/share';

const REACTION_ORDER = ['like', 'love', 'care', 'angry'] as const;
type ReactionType = (typeof REACTION_ORDER)[number];

type ReactionState = {
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
};

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  care: '🤗',
  angry: '😡',
};

const defaultReactionState: ReactionState = {
  counts: { like: 0, love: 0, care: 0, angry: 0 },
  mine: null,
};

function createDefaultReaction(): ReactionState {
  return { counts: { ...defaultReactionState.counts }, mine: null };
}

function computeOptimistic(prev: ReactionState, nextMine: ReactionType | null): ReactionState {
  const counts: ReactionState['counts'] = { ...prev.counts };
  if (prev.mine) counts[prev.mine] = Math.max(0, (counts[prev.mine] || 0) - 1);
  if (nextMine) counts[nextMine] = (counts[nextMine] || 0) + 1;
  return { counts, mine: nextMine };
}

type FeedPost = {
  id: string;
  content?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  link_url?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

type Props = {
  authorId: string;
  /** ID alternativi (es. user_id) da provare se il feed è vuoto con l'id principale */
  fallbackAuthorIds?: string[];
};

export default function PublicAuthorFeed({ authorId, fallbackAuthorIds = [] }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [reactionError, setReactionError] = useState<string | null>(null);

  const loadReactions = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const qs = encodeURIComponent(ids.join(','));
      const res = await fetch(`/api/feed/reactions?ids=${qs}`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'reaction_error');
      const counts = Array.isArray(json.counts) ? json.counts : [];
      const mine = Array.isArray(json.mine) ? json.mine : [];
      const next: Record<string, ReactionState> = {};
      ids.forEach((id) => {
        next[id] = createDefaultReaction();
      });
      counts.forEach((row: any) => {
        const key = String(row.post_id);
        const reaction = row.reaction as ReactionType;
        if (!REACTION_ORDER.includes(reaction)) return;
        next[key] = next[key] || createDefaultReaction();
        next[key].counts[reaction] = Number(row.count) || 0;
      });
      mine.forEach((row: any) => {
        const key = String(row.post_id);
        const reaction = row.reaction as ReactionType;
        if (!REACTION_ORDER.includes(reaction)) return;
        next[key] = next[key] || createDefaultReaction();
        next[key].mine = reaction;
      });
      setReactions((curr) => ({ ...curr, ...next }));
      setReactionError(null);
    } catch (e) {
      setReactionError('Reazioni non disponibili.');
    }
  }, []);

  const loadCommentCounts = useCallback(async (ids: string[]) => {
    const list = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (!list.length) return;
    try {
      const qs = encodeURIComponent(list.join(','));
      const res = await fetch(`/api/feed/comments/counts?ids=${qs}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error('comment_error');
      const rows = Array.isArray(json.counts) ? json.counts : [];
      const map: Record<string, number> = {};
      rows.forEach((row: any) => {
        map[String(row.post_id)] = Number(row.count) || 0;
      });
      setCommentCounts((curr) => ({ ...curr, ...map }));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const idsToTry = [authorId, ...fallbackAuthorIds].map((id) => id?.trim()).filter(Boolean);
    if (idsToTry.length === 0) return;

    const abort = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let loaded: FeedPost[] | null = null;
        let lastError: string | null = null;

        for (const id of idsToTry) {
          const res = await fetch(`/api/feed/posts?authorId=${encodeURIComponent(id)}`, {
            cache: 'no-store',
            credentials: 'include',
            signal: abort.signal,
          });
          if (!res.ok) {
            lastError = 'Errore caricamento post';
            continue;
          }

          const json = await res.json().catch(() => ({}));
          const arr = Array.isArray(json?.items ?? json?.data) ? (json.items ?? json.data) : [];
          if (arr.length > 0) {
            loaded = arr as FeedPost[];
            break;
          }
        }

        setPosts(loaded ?? []);
        if (!loaded && lastError) setError(lastError);
        if (loaded && loaded.length > 0) {
          const ids = loaded.map((p) => p.id.toString());
          void loadReactions(ids);
          void loadCommentCounts(ids);
        }
      } catch (err: any) {
        if (!abort.signal.aborted) setError(err?.message || 'Errore caricamento bacheca');
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => abort.abort();
  }, [authorId, fallbackAuthorIds, loadCommentCounts, loadReactions]);

  async function toggleReaction(postId: string, type: ReactionType) {
    const prev = reactions[postId] ?? createDefaultReaction();
    const nextMine = prev.mine === type ? null : type;
    const next = computeOptimistic(prev, nextMine);
    setReactions((curr) => ({ ...curr, [postId]: next }));
    try {
      const res = await fetch('/api/feed/reactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reaction: nextMine }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'reaction_error');
      const counts: ReactionState['counts'] = { ...defaultReactionState.counts };
      const rows = Array.isArray(json.counts) ? json.counts : [];
      rows.forEach((row: any) => {
        const reaction = row.reaction as ReactionType;
        if (REACTION_ORDER.includes(reaction)) {
          counts[reaction] = Number(row.count) || 0;
        }
      });
      const mineReaction = REACTION_ORDER.includes(json.mine as ReactionType)
        ? (json.mine as ReactionType)
        : null;
      setReactions((curr) => ({ ...curr, [postId]: { counts, mine: mineReaction } }));
    } catch (err: any) {
      setReactions((curr) => ({ ...curr, [postId]: prev }));
      if (String(err?.message || '').includes('not_authenticated')) {
        setReactionError('Accedi per reagire ai post.');
      } else {
        setReactionError('Impossibile registrare la reazione.');
      }
    }
  }

  return (
    <div className="space-y-3">
      {loading && <div className="text-sm text-gray-600">Caricamento feed…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && posts.length === 0 && (
        <div className="text-sm text-gray-600">Nessun contenuto pubblicato finora.</div>
      )}

      {posts.map((post) => (
        <PublicPostCard
          key={post.id}
          post={post}
          reaction={reactions[String(post.id)] ?? createDefaultReaction()}
          pickerOpen={pickerFor === String(post.id)}
          onOpenPicker={() => setPickerFor(String(post.id))}
          onClosePicker={() => setPickerFor((curr) => (curr === String(post.id) ? null : curr))}
          onToggleReaction={(type) => toggleReaction(String(post.id), type)}
          commentCount={commentCounts[String(post.id)] ?? 0}
          onCommentCountChange={(next) =>
            setCommentCounts((curr) => ({ ...curr, [String(post.id)]: next }))
          }
        />
      ))}

      {reactionError ? <div className="text-xs text-red-600">{reactionError}</div> : null}
    </div>
  );
}

type PublicPostCardProps = {
  post: FeedPost;
  reaction: ReactionState;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onToggleReaction: (type: ReactionType) => void;
  commentCount: number;
  onCommentCountChange?: (next: number) => void;
};

function PublicPostCard({
  post,
  reaction,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onToggleReaction,
  commentCount,
  onCommentCountChange,
}: PublicPostCardProps) {
  const [commentSignal, setCommentSignal] = useState(0);
  const createdAt = post.created_at || post.createdAt;
  const reactionSummaryParts = REACTION_ORDER.filter((key) => (reaction.counts[key] || 0) > 0).map(
    (key) => `${REACTION_EMOJI[key]} ${reaction.counts[key]}`,
  );
  const totalReactions = REACTION_ORDER.reduce((acc, key) => acc + (reaction.counts[key] || 0), 0);
  const reactionSummaryText = reactionSummaryParts.length ? reactionSummaryParts.join(' · ') : 'Nessuna reazione';

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return getPostPermalink(window.location.origin, String(post.id));
  }, [post.id]);

  const handleShare = useCallback(() => {
    void shareOrCopyLink({
      title: 'Post',
      text: post.content || undefined,
      url: shareUrl,
      copiedMessage: 'Link del post copiato negli appunti',
    });
  }, [post.content, shareUrl]);

  return (
    <article className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-neutral-500">{formatDate(createdAt)}</div>
      {post.content ? <p className="whitespace-pre-wrap text-sm text-neutral-800">{post.content}</p> : null}
      <PostMedia
        postId={post.id}
        mediaUrl={post.media_url}
        mediaType={post.media_type}
        aspect={post.media_type === 'video' ? '16:9' : null}
        alt={post.content || 'Media del post'}
      />
      {post.link_url ? (
        <a
          href={post.link_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
        >
          {post.link_url}
        </a>
      ) : null}

      <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
        <div>
          {totalReactions > 0 ? `${totalReactions} reazioni · ${reactionSummaryText}` : 'Nessuna reazione'}
        </div>
        <div>{commentCount > 0 ? `${commentCount} commenti` : 'Nessun commento'}</div>
      </div>

      <div
        className="mt-2 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-700"
        onMouseLeave={onClosePicker}
      >
        <div className="relative inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleReaction('like')}
            onMouseEnter={onOpenPicker}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
              reaction.mine
                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
            }`}
            aria-pressed={reaction.mine === 'like'}
          >
            <span aria-hidden className="text-xl">{REACTION_EMOJI[reaction.mine ?? 'like']}</span>
            <span>Reagisci</span>
          </button>

          <button
            type="button"
            className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 hover:border-neutral-300"
            onClick={() => (pickerOpen ? onClosePicker() : onOpenPicker())}
            aria-label="Scegli reazione"
          >
            ⋯
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 flex gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1 shadow-lg">
              {REACTION_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onToggleReaction(r);
                    onClosePicker();
                  }}
                  className={`flex items-center justify-center rounded-full px-2 py-1 text-xl transition ${
                    reaction.mine === r ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'hover:bg-neutral-100'
                  }`}
                >
                  <span aria-hidden>{REACTION_EMOJI[r]}</span>
                  <span className="sr-only">{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-neutral-800 transition hover:border-neutral-300"
          onClick={() => setCommentSignal((v) => v + 1)}
        >
          <span aria-hidden>💬</span>
          <span>Commenta</span>
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-neutral-800 transition hover:border-neutral-300"
          onClick={handleShare}
        >
          <span aria-hidden>🔗</span>
          <span>Condividi</span>
        </button>
      </div>

      <CommentsSection
        postId={String(post.id)}
        initialCount={commentCount}
        expandSignal={commentSignal}
        onCountChange={onCommentCountChange}
      />
    </article>
  );
}
