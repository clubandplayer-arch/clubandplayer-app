// components/feed/PublicAuthorFeed.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import {
  REACTION_ORDER,
  computeOptimistic,
  createDefaultReaction,
  normalizePost,
  type FeedPost,
  type ReactionState,
  type ReactionType,
} from '@/components/feed/postShared';

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
            loaded = arr.map((p: any) => normalizePost(p));
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
        <PostCard
          key={post.id}
          post={post}
          currentUserId={null}
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
