'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import {
  computeOptimistic,
  createDefaultReaction,
  REACTION_ORDER,
  type FeedPost,
  type ReactionState,
  type ReactionType,
} from '@/components/feed/postShared';

type Props = {
  post: FeedPost;
  currentUserId: string | null;
};

export function PostClient({ post, currentUserId }: Props) {
  const [item, setItem] = useState(post);
  const [reaction, setReaction] = useState<ReactionState>(createDefaultReaction());
  const [commentCount, setCommentCount] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = String(item.id);
    async function load() {
      try {
        const qs = encodeURIComponent(id);
        const res = await fetch(`/api/feed/reactions?ids=${qs}`, { cache: 'no-store', credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'reaction_error');
        const counts = Array.isArray(json.counts) ? json.counts : [];
        const mine = Array.isArray(json.mine) ? json.mine : [];
        let next = createDefaultReaction();
        counts.forEach((row: any) => {
          if (String(row.post_id) !== id) return;
          const r = row.reaction as ReactionType;
          const value = Number(row.count) || 0;
          if (REACTION_ORDER.includes(r)) {
            next = { ...next, counts: { ...next.counts, [r]: value } } as ReactionState;
          }
        });
        mine.forEach((row: any) => {
          if (String(row.post_id) !== id) return;
          const r = row.reaction as ReactionType;
          if (REACTION_ORDER.includes(r)) {
            next = { ...next, mine: r };
          }
        });
        setReaction(next);
      } catch (e: any) {
        setError(e?.message || 'Reazioni non disponibili');
      }
    }
    void load();
  }, [item.id]);

  useEffect(() => {
    const id = String(item.id);
    async function loadCounts() {
      try {
        const res = await fetch(`/api/feed/comments/counts?ids=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error('comment_error');
        const rows = Array.isArray(json.counts) ? json.counts : [];
        const row = rows.find((r: any) => String(r.post_id) === id);
        setCommentCount(row ? Number(row.count) || 0 : 0);
      } catch {
        setCommentCount(0);
      }
    }
    void loadCounts();
  }, [item.id]);

  const toggleReaction = useCallback(
    async (type: ReactionType) => {
      setReaction((prev) => computeOptimistic(prev, prev.mine === type ? null : type));
      try {
        const res = await fetch('/api/feed/reactions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: item.id, reaction: reaction.mine === type ? null : type }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'reaction_error');
        const next = createDefaultReaction();
        const rows = Array.isArray(json.counts) ? json.counts : [];
        rows.forEach((row: any) => {
          const r = row.reaction as ReactionType;
          if (REACTION_ORDER.includes(r)) {
            next.counts[r] = Number(row.count) || 0;
          }
        });
        const mineReaction = REACTION_ORDER.includes(json?.mine as ReactionType) ? (json.mine as ReactionType) : null;
        setReaction({ ...next, mine: mineReaction });
      } catch (e: any) {
        setError(e?.message || 'Reazioni non disponibili');
      }
    },
    [item.id, reaction.mine],
  );

  if (deleted) {
    return <div className="glass-panel p-4 text-sm text-neutral-700">Post eliminato o non disponibile.</div>;
  }

  return (
    <div className="space-y-3">
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
      <PostCard
        post={item}
        currentUserId={currentUserId}
        onUpdated={setItem}
        onDeleted={() => setDeleted(true)}
        reaction={reaction}
        commentCount={commentCount}
        pickerOpen={pickerOpen}
        onOpenPicker={() => setPickerOpen(true)}
        onClosePicker={() => setPickerOpen(false)}
        onToggleReaction={toggleReaction}
        onCommentCountChange={setCommentCount}
      />
    </div>
  );
}
