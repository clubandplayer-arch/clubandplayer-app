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

type ReactionType = 'like' | 'love' | 'care' | 'angry';

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

const REACTION_ORDER: ReactionType[] = ['like', 'love', 'care', 'angry'];

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
  counts: {
    like: 0,
    love: 0,
    care: 0,
    angry: 0,
  },
  mine: null,
};

const createDefaultReaction = (): ReactionState => ({
  counts: { ...defaultReactionState.counts },
  mine: null,
});

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
  const [pickerFor, setPickerFor] = useState<string | null>(null);

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
        if (!map[key]) map[key] = createDefaultReaction();
        const value = Number(row.count) || 0;
        if (REACTION_ORDER.includes(row.reaction as ReactionType)) {
          map[key].counts[row.reaction as ReactionType] = value;
        }
      });

      const mine = Array.isArray(json.mine) ? json.mine : [];
      mine.forEach((row: any) => {
        const key = String(row.post_id);
        if (!map[key]) map[key] = createDefaultReaction();
        if (REACTION_ORDER.includes(row.reaction as ReactionType)) {
          map[key].mine = row.reaction as ReactionType;
        }
      });

      setReactions(map);
      setReactionError(null);
    } catch (err) {
      setReactionError('Reazioni non disponibili al momento.');
    }
  }, []);

  const computeOptimistic = (prev: ReactionState, next: ReactionType | null): ReactionState => {
    const counts: ReactionState['counts'] = { ...prev.counts };
    const current = prev.mine;

    if (current && counts[current] > 0) {
      counts[current] = counts[current] - 1;
    }

    if (next) {
      counts[next] = (counts[next] || 0) + 1;
    }

    return { counts, mine: next };
  };

  async function toggleReaction(postId: string | number, type: ReactionType) {
    const key = String(postId);
    const prev = reactions[key] ?? createDefaultReaction();
    const nextMine = prev.mine === type ? null : type;
    const next = computeOptimistic(prev, nextMine);

    setReactions((curr) => ({ ...curr, [key]: next }));
    setReactionError(null);

    try {
      const res = await fetch('/api/feed/reactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: key, reaction: nextMine }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const counts: ReactionState['counts'] = { ...defaultReactionState.counts };
      const resCounts = Array.isArray(json.counts) ? json.counts : [];
      resCounts.forEach((row: any) => {
        if (REACTION_ORDER.includes(row.reaction as ReactionType)) {
          counts[row.reaction as ReactionType] = Number(row.count) || 0;
        }
      });
      const mineReaction = REACTION_ORDER.includes(json.mine as ReactionType)
        ? (json.mine as ReactionType)
        : null;

      setReactions((curr) => ({ ...curr, [key]: { counts, mine: mineReaction } }));
    } catch (err: any) {
      setReactions((curr) => ({ ...curr, [key]: prev }));
      if (resolvableAuthError(err)) {
        alert('Accedi per reagire ai post.');
      } else if (String(err?.message || '').includes('missing_table_post_reactions')) {
        setReactionError('Aggiungi la tabella post_reactions seguendo docs/supabase-feed-reactions.sql.');
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
      setReactions((prev) => ({ ...prev, [String(newPost.id)]: createDefaultReaction() }));
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
                    const reaction = reactions[String(post.id)] ?? createDefaultReaction();
                    const summaryParts = REACTION_ORDER
                      .filter((key) => (reaction.counts[key] || 0) > 0)
                      .map((key) => `${REACTION_EMOJI[key]} ${reaction.counts[key]}`);
                    const total = REACTION_ORDER.reduce((acc, key) => acc + (reaction.counts[key] || 0), 0);
                    const summaryText = summaryParts.length
                      ? summaryParts.join(' · ')
                      : 'Nessuna reazione';

                    const key = String(post.id);

                    return (
                      <div className="mt-3 flex flex-col gap-1 text-[11px] text-neutral-700">
                        <div
                          className="relative inline-flex w-full max-w-xs items-center gap-2"
                          onMouseLeave={() => setPickerFor((curr) => (curr === key ? null : curr))}
                        >
                          <button
                            type="button"
                            onClick={() => toggleReaction(post.id, 'like')}
                            onMouseEnter={() => setPickerFor(key)}
                            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                              reaction.mine
                                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                                : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                            }`}
                            aria-pressed={reaction.mine === 'like'}
                          >
                            <span aria-hidden>{REACTION_EMOJI[reaction.mine ?? 'like']}</span>
                            <span>{reaction.mine ? 'Hai reagito' : 'Mi piace'}</span>
                          </button>

                          <button
                            type="button"
                            className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 hover:border-neutral-300"
                            onClick={() => setPickerFor((curr) => (curr === key ? null : key))}
                            aria-label="Scegli reazione"
                          >
                            ⋯
                          </button>

                          {pickerFor === key && (
                            <div className="absolute left-0 top-full z-10 mt-1 flex gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1 shadow-lg">
                              {REACTION_ORDER.map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => {
                                    toggleReaction(post.id, r);
                                    setPickerFor(null);
                                  }}
                                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition ${
                                    reaction.mine === r
                                      ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                                      : 'hover:bg-neutral-100'
                                  }`}
                                >
                                  <span aria-hidden>{REACTION_EMOJI[r]}</span>
                                  <span className="capitalize">{r}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] text-neutral-600">
                          {reaction.mine ? (
                            <span className="font-semibold text-[var(--brand)]">
                              Tu
                              {total > 1 ? ` e altre ${total - 1} persone` : ''} · {summaryText}
                            </span>
                          ) : (
                            summaryText
                          )}
                        </div>
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
                href="/search-map"
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

// Nessun componente aggiuntivo in fondo: la UI per le reazioni è inline per mantenere leggerezza
