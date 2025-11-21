'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProfileMiniCard from '@/components/profiles/ProfileMiniCard';
import WhoToFollow from '@/components/feed/WhoToFollow';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';

type ApiPost = {
  id: string | number;
  text?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
};

type Post = {
  id: string | number;
  content: string;
  createdAt: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
};

type ReactionType = 'goal' | 'red_card';

type ReactionState = {
  goal: number;
  red_card: number;
  mineGoal: boolean;
  mineRed: boolean;
};

const MAX_CHARS = 500;

function normalizePosts(items?: ApiPost[] | null): Post[] {
  if (!items) return [];
  return items.map((p) => ({
    id: p.id,
    content: (p.content ?? p.text ?? '').toString(),
    createdAt:
      p.created_at ??
      p.createdAt ??
      new Date().toISOString(),
    mediaUrl: p.media_url ?? null,
    mediaType: p.media_type ?? null,
  }));
}

const defaultReactionState: ReactionState = {
  goal: 0,
  red_card: 0,
  mineGoal: false,
  mineRed: false,
};

function resolvableAuthError(err: any) {
  const msg = String(err?.message || '');
  return msg.includes('not_authenticated') || /401/.test(msg);
}

export default function FeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [reactionError, setReactionError] = useState<string | null>(null);

  const loadReactions = useCallback(async (postIds: Array<string | number>) => {
    const ids = Array.from(new Set(postIds.map((id) => String(id)).filter(Boolean)));
    if (!ids.length) {
      setReactions({});
      return;
    }

    try {
      const qs = encodeURIComponent(ids.join(','));
      const res = await fetch(`/api/feed/reactions?ids=${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Errore nel recupero delle reazioni');
      }

      const map: Record<string, ReactionState> = {};
      const counts = Array.isArray(json.counts) ? json.counts : [];
      counts.forEach((row: any) => {
        const key = String(row.post_id);
        if (!map[key]) map[key] = { ...defaultReactionState };
        const value = Number(row.count) || 0;
        if (row.reaction_type === 'goal') map[key].goal = value;
        if (row.reaction_type === 'red_card') map[key].red_card = value;
      });

      const mine = Array.isArray(json.mine) ? json.mine : [];
      mine.forEach((row: any) => {
        const key = String(row.post_id);
        if (!map[key]) map[key] = { ...defaultReactionState };
        if (row.reaction_type === 'goal') map[key].mineGoal = true;
        if (row.reaction_type === 'red_card') map[key].mineRed = true;
      });

      setReactions(map);
      setReactionError(null);
    } catch (err) {
      setReactionError('Reazioni non disponibili al momento.');
    }
  }, []);

  async function toggleReaction(postId: string | number, type: ReactionType) {
    const key = String(postId);
    const prev = reactions[key] ?? { ...defaultReactionState };
    const active = type === 'goal' ? prev.mineGoal : prev.mineRed;
    const next: ReactionState = {
      ...prev,
      mineGoal: type === 'goal' ? !active : prev.mineGoal,
      mineRed: type === 'red_card' ? !active : prev.mineRed,
      goal: type === 'goal' ? Math.max(0, prev.goal + (active ? -1 : 1)) : prev.goal,
      red_card:
        type === 'red_card' ? Math.max(0, prev.red_card + (active ? -1 : 1)) : prev.red_card,
    };

    setReactions((curr) => ({ ...curr, [key]: next }));
    setReactionError(null);

    try {
      const res = await fetch('/api/feed/reactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: key, reactionType: type }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setReactions((curr) => ({ ...curr, [key]: prev }));
      if (resolvableAuthError(err)) {
        alert('Accedi per reagire ai post.');
      } else if (String(err?.message || '').includes('missing_table_feed_post_reactions')) {
        setReactionError('Aggiungi la tabella feed_post_reactions seguendo docs/supabase-feed-reactions.sql.');
      } else {
        setReactionError('Impossibile registrare la reazione, riprova.');
      }
    }
  }

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/feed/posts', {
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        const normalized = normalizePosts(json.items);
        setPosts(normalized);
        void loadReactions(normalized.map((p) => p.id));
      } else {
        console.warn('[FeedClient] loadPosts error', json);
      }
    } catch (err) {
      console.error('[FeedClient] loadPosts fatal', err);
    } finally {
      setLoading(false);
    }
  }, [loadReactions]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = text.trim();
    if (!value) return;

    if (value.length > MAX_CHARS) {
      setError(`Massimo ${MAX_CHARS} caratteri.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const code = json?.error || 'Impossibile pubblicare.';
        if (code === 'rate_limited') {
          setError(
            'Stai pubblicando troppo frequentemente. Riprova tra qualche secondo.'
          );
        } else if (code === 'not_authenticated') {
          setError('Devi essere autenticato per pubblicare.')
        } else {
          setError(code);
        }
        return;
      }

      const newPost = normalizePosts([json.item])[0];
      setPosts((prev) =>
        newPost ? [newPost, ...prev] : prev
      );
      if (newPost) {
        setReactions((prev) => ({ ...prev, [String(newPost.id)]: { ...defaultReactionState } }));
      }
      setText('');
    } catch (err) {
      console.error('[FeedClient] submit fatal', err);
      setError('Errore inatteso durante la pubblicazione.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-9">
      {/* COLONNA PRINCIPALE */}
      <section className="lg:col-span-6 flex flex-col gap-6">
        {/* Il tuo profilo */}
        <div className="card p-4">
          <ProfileMiniCard />
        </div>

        {/* Composer */}
        <div className="card p-4">
          <div className="mb-2 text-sm text-neutral-600">
            Condividi un aggiornamento
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2"
          >
            <textarea
              className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              rows={3}
              maxLength={MAX_CHARS}
              placeholder="Scrivi qualcosa per club e atleti della community..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
            />
            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span>
                {text.length}/{MAX_CHARS}
              </span>
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {submitting ? 'Pubblico...' : 'Pubblica'}
              </button>
            </div>
            {error && (
              <div className="text-[10px] text-red-600">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Lista post */}
        <div className="card p-4">
          <div className="mb-3 text-sm font-medium">
            Aggiornamenti della community
          </div>
          {loading ? (
            <div className="text-xs text-neutral-500">
              Caricamento…
            </div>
          ) : posts.length === 0 ? (
            <div className="text-xs text-neutral-500">
              Nessun aggiornamento ancora. Scrivi il primo post!
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs text-neutral-800"
                >
                  <div className="whitespace-pre-line">
                    {post.content}
                  </div>
                  {post.mediaUrl ? (
                    <div className="mt-2 overflow-hidden rounded-lg border bg-white">
                      {post.mediaType === 'video' ? (
                        <InlineVideoPlayer id={String(post.id)} url={post.mediaUrl} />
                      ) : (
                        <img src={post.mediaUrl} alt="Allegato" className="max-h-96 w-full object-cover" />
                      )}
                    </div>
                  ) : null}
                  <div className="mt-1 text-[9px] text-neutral-400">
                    {new Date(
                      post.createdAt
                    ).toLocaleString('it-IT')}
                  </div>

                  {(() => {
                    const reaction = reactions[String(post.id)] ?? { ...defaultReactionState };
                    return (
                      <div className="mt-2 flex items-center gap-3 text-[11px]">
                        <ReactionButton
                          type="goal"
                          active={reaction.mineGoal}
                          count={reaction.goal}
                          onClick={() => toggleReaction(post.id, 'goal')}
                        />
                        <ReactionButton
                          type="red_card"
                          active={reaction.mineRed}
                          count={reaction.red_card}
                          onClick={() => toggleReaction(post.id, 'red_card')}
                        />
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
          {reactionError && (
            <div className="mt-2 text-[10px] text-red-600">{reactionError}</div>
          )}
        </div>
      </section>

      {/* COLONNA DESTRA */}
      <aside className="hidden lg:col-span-3 lg:flex lg:flex-col lg:gap-4">
        {/* Trending */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">
            🔥 Trending
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link
                href="/search/athletes?trend=mercato"
                className="text-blue-600 hover:underline"
              >
                Calciomercato dilettanti
              </Link>
            </li>
            <li>
              <Link
                href="/opportunities?role=goalkeeper&gender=f"
                className="text-blue-600 hover:underline"
              >
                Portieri femminili U21
              </Link>
            </li>
            <li>
              <Link
                href="/feed?tag=preparazione"
                className="text-blue-600 hover:underline"
              >
                Preparazione invernale
              </Link>
            </li>
            <li>
              <Link
                href="/opportunities?league=serie-d&role=winger"
                className="text-blue-600 hover:underline"
              >
                Serie D – esterni veloci
              </Link>
            </li>
          </ul>
        </div>

        {/* Suggerimenti (usa l'endpoint /api/follows/suggestions) */}
        <WhoToFollow />
      </aside>
    </div>
  );
}

function InlineVideoPlayer({ id, url }: { id: string; url?: string | null }) {
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(id);

  return (
    <video
      ref={videoRef}
      src={url ?? undefined}
      controls
      className="max-h-96 w-full"
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={handleEnded}
    />
  );
}

function ReactionButton({
  type,
  active,
  count,
  onClick,
}: {
  type: ReactionType;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const isGoal = type === 'goal';
  const icon = isGoal ? '⚽' : '🟥';
  const label = isGoal ? 'Ti piace' : 'Non ti piace';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1 rounded-full border px-3 py-1 transition ${
        active
          ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="text-[11px] font-semibold">{count}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
