'use client';

/* eslint-disable @next/next/no-img-element */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import FeedComposer from '@/components/feed/FeedComposer';
import TrackRetention from '@/components/analytics/TrackRetention';
import { PostCard } from '@/components/feed/PostCard';
import { HorizontalAdBanner } from '@/components/ads/HorizontalAdBanner';
import { VerticalAdBanner } from '@/components/ads/VerticalAdBanner';
import {
  computeOptimistic,
  createDefaultReaction,
  defaultReactionState,
  normalizePost,
  REACTION_ORDER,
  type FeedPost,
  type ReactionState,
  type ReactionType,
} from '@/components/feed/postShared';

// carico le sidebar in modo "sicuro" (se il componente esiste lo usa, altrimenti mostra un box vuoto)
// N.B. ssr: false evita problemi coi Server Components in prod
const ProfileMiniCard = dynamic(() => import('@/components/profiles/ProfileMiniCard'), {
  ssr: false,
  loading: () => <ProfileCardFallback />,
});

const WhoToFollow = dynamic(() => import('@/components/feed/WhoToFollow'), {
  ssr: false,
  loading: () => <SidebarCard title="Chi seguire" />,
});

const FollowedClubs = dynamic(() => import('@/components/feed/FollowedClubs'), {
  ssr: false,
  loading: () => <SidebarCard title="Club che segui" />,
});

const FeedHighlights = dynamic(() => import('@/components/feed/FeedHighlights'), {
  ssr: false,
  loading: () => <SidebarCard title="In evidenza" />,
});

async function fetchPosts(signal?: AbortSignal, authorId?: string | null): Promise<FeedPost[]> {
  const params = new URLSearchParams({ limit: '20' });
  if (authorId) params.set('authorId', authorId);

  const res = await fetch(`/api/feed/posts?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({} as any));
  const arr = Array.isArray(j?.items ?? j?.data) ? (j.items ?? j.data) : [];
  return arr.map(normalizePost);
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const fetchCtrl = useRef<AbortController | null>(null);
  const headingId = 'feed-heading';

  const loadReactions = useCallback(async (ids: Array<string | number>) => {
    if (!ids.length) return;
    try {
      const qs = encodeURIComponent(ids.map(String).join(','));
      const res = await fetch(`/api/feed/reactions?ids=${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({} as any));
      if (res.ok && json?.ok) {
        const counts = Array.isArray(json.counts) ? json.counts : [];
        const mine = Array.isArray(json.mine) ? json.mine : [];
        const next: Record<string, ReactionState> = {};
        ids.forEach((id) => {
          next[String(id)] = createDefaultReaction();
        });
        counts.forEach((row: any) => {
          const key = String(row.post_id);
          const reaction = row.reaction as ReactionType;
          if (!REACTION_ORDER.includes(reaction)) return;
          const value = Number(row.count) || 0;
          next[key] = next[key] || createDefaultReaction();
          next[key].counts[reaction] = value;
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
      } else if (json?.missingTable) {
        setReactionError('Aggiungi la tabella post_reactions seguendo supabase/migrations/20251018_fix_notifications_follows_post_reactions.sql.');
      } else {
        setReactionError('Impossibile caricare le reazioni.');
      }
    } catch (err) {
      console.warn('loadReactions failed', err);
      setReactionError('Impossibile caricare le reazioni.');
    }
  }, []);

  const loadCommentCounts = useCallback(async (ids: Array<string | number>) => {
    const list = Array.from(new Set(ids.map(String).filter(Boolean)));
    if (!list.length) return;

    try {
      const qs = encodeURIComponent(list.join(','));
      const res = await fetch(`/api/feed/comments/counts?ids=${qs}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'comment_error');
      const rows = Array.isArray(json.counts) ? json.counts : [];
      const map: Record<string, number> = {};
      rows.forEach((row: any) => {
        const key = String(row.post_id);
        map[key] = Number(row.count) || 0;
      });
      setCommentCounts((curr) => ({ ...curr, ...map }));
    } catch (err) {
      console.warn('loadCommentCounts failed', err);
    }
  }, []);

  const toggleReaction = useCallback(
    async (postId: string, type: ReactionType) => {
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
        const rows = Array.isArray(json?.counts) ? json.counts : [];
        rows.forEach((row: any) => {
          const reaction = row.reaction as ReactionType;
          if (!REACTION_ORDER.includes(reaction)) return;
          counts[reaction] = Number(row.count) || 0;
        });
        const mineReaction = REACTION_ORDER.includes(json?.mine as ReactionType)
          ? (json.mine as ReactionType)
          : null;

        setReactions((curr) => ({ ...curr, [key]: { counts, mine: mineReaction } }));
      } catch (error: any) {
        console.warn('toggleReaction failed', error);
        setReactions((curr) => ({ ...curr, [key]: prev }));
        if (String(error?.message || '').includes('missing_table_post_reactions')) {
          setReactionError('Aggiungi la tabella post_reactions (vedi supabase/migrations/20251018_fix_notifications_follows_post_reactions.sql).');
        } else if (error?.message === 'not_authenticated') {
          setReactionError('Accedi per reagire ai post.');
        } else {
          setReactionError('Impossibile registrare la reazione, riprova.');
        }
      }
    },
    [reactions],
  );

  const reload = useCallback(async () => {
    if (fetchCtrl.current) fetchCtrl.current.abort();
    const controller = new AbortController();
    fetchCtrl.current = controller;
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchPosts(controller.signal, currentUserId);
      setItems(data);
      void loadReactions(data.map((p) => p.id));
      void loadCommentCounts(data.map((p) => p.id));
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setErr(e?.message ?? 'Errore caricamento bacheca');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [currentUserId, loadCommentCounts, loadReactions]);

  useEffect(() => {
    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as any).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 120);
    const cancelIdle =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? (window as any).cancelIdleCallback
        : clearTimeout;
    const handle = idle(() => void reload());
    return () => {
      cancelIdle(handle);
      fetchCtrl.current?.abort();
    };
  }, [reload]);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => null);
        const id = j?.user?.id ?? null;
        setCurrentUserId(id);
      } catch {
        setCurrentUserId(null);
      }
    }
    void loadUser();
  }, []);

  function onPostUpdated(next: FeedPost) {
    setItems((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
  }

  function onPostDeleted(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-4 sm:px-5 md:px-6 lg:px-6"
      aria-labelledby={headingId}
    >
      {/* layout a 3 colonne: sx (minicard) / centro (composer + post) / dx (suggerimenti) */}
      <div
        className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[280px_minmax(0,2.2fr)_minmax(0,1.2fr)] xl:grid-cols-[300px_minmax(0,2.5fr)_minmax(0,1.3fr)] lg:items-start"
      >
        {/* Colonna sinistra: mini profilo */}
        <aside className="min-w-0 space-y-4">
          <div className="space-y-3">
            {/* Se esiste, il componente reale rimpiazzerà questo blocco via dynamic() */}
            <ProfileMiniCard />
          </div>
          <MyMediaHub currentUserId={currentUserId} posts={items} />
          <VerticalAdBanner className="hidden border border-blue-900/30 md:block" />
        </aside>

        {/* Colonna centrale: composer + feed */}
        <main className="min-w-0 space-y-4" aria-labelledby={headingId}>
          <TrackRetention scope="feed" />
          <h1 id={headingId} className="sr-only">
            Bacheca feed
          </h1>
          <FeedComposer onPosted={reload} />

          <div className="space-y-4" aria-live="polite" aria-busy={loading}>
            {loading && (
              <div className="glass-panel p-4" role="status">
                Caricamento…
              </div>
            )}
            {err && (
              <div className="glass-panel p-4 text-red-600" role="alert">
                {err}
              </div>
            )}
            {!loading && !err && items.length === 0 && (
              <div className="glass-panel p-4 text-sm text-gray-600" role="status">
                Nessun post ancora.
              </div>
            )}
            {!loading &&
              !err &&
              items.map((p, index) => (
                <Fragment key={p.id}>
                  {index > 0 && index % 2 === 0 ? (
                    <HorizontalAdBanner className="border border-amber-200/70" />
                  ) : null}
                  <PostCard
                    post={p}
                    currentUserId={currentUserId}
                    onUpdated={onPostUpdated}
                    onDeleted={onPostDeleted}
                    reaction={reactions[String(p.id)] ?? createDefaultReaction()}
                    commentCount={commentCounts[String(p.id)] ?? 0}
                    pickerOpen={pickerFor === String(p.id)}
                    onOpenPicker={() => setPickerFor(String(p.id))}
                    onClosePicker={() => setPickerFor((curr) => (curr === String(p.id) ? null : curr))}
                    onToggleReaction={(type) => toggleReaction(String(p.id), type)}
                    onCommentCountChange={(next) =>
                      setCommentCounts((curr) => ({ ...curr, [String(p.id)]: next }))
                    }
                  />
                </Fragment>
              ))}
            {reactionError && (
              <div className="text-[11px] text-red-600" role="status">
                {reactionError}
              </div>
            )}
          </div>
        </main>

        {/* Colonna destra: suggerimenti/annunci/club seguiti */}
        <aside className="min-w-0 space-y-4">
          <SidebarCard>
            <WhoToFollow />
          </SidebarCard>

          <SidebarCard>
            <FollowedClubs />
          </SidebarCard>

          <SidebarCard>
            <FeedHighlights />
          </SidebarCard>

          <VerticalAdBanner className="border border-blue-900/30" />

          <VerticalAdBanner className="border border-blue-900/30" />
        </aside>
      </div>
    </div>
  );
}

/* ====== UI helpers ====== */

function SidebarCard({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-panel">
      {title ? (
        <div className="px-4 py-3 text-sm font-semibold">{title}</div>
      ) : null}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function ProfileCardFallback() {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-start gap-3">
        <div className="h-24 w-[4.8rem] flex-shrink-0 animate-pulse rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function MyMediaHub({
  currentUserId,
  posts,
}: {
  currentUserId: string | null;
  posts: FeedPost[];
}) {
  const [tab, setTab] = useState<'video' | 'image'>('video');

  const { videos, photos } = useMemo(() => {
    const mine = posts.filter((p) => p.authorId && p.authorId === currentUserId);
    const vids = mine.filter((p) => p.media_type === 'video' && p.media_url).slice(0, 3);
    const imgs = mine.filter((p) => p.media_type === 'image' && p.media_url).slice(0, 3);
    return { videos: vids, photos: imgs };
  }, [posts, currentUserId]);

  if (!currentUserId) return null;

  return (
    <div className="glass-panel" id="my-media">
      <div className="flex items-center px-4 py-3 text-sm font-semibold">
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${tab === 'video' ? 'bg-gray-900 text-white' : 'bg-white/60'}`}
            onClick={() => setTab('video')}
          >
            MyVideo
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${tab === 'image' ? 'bg-gray-900 text-white' : 'bg-white/60'}`}
            onClick={() => setTab('image')}
          >
            MyPhoto
          </button>
        </div>
      </div>
      <div className="px-4 pb-4">
        {tab === 'video' ? (
          <MediaPreviewGrid
            emptyLabel="Non hai ancora video"
            items={videos}
            linkHref="/mymedia?type=video"
            sectionId="my-videos"
          />
        ) : (
          <MediaPreviewGrid
            emptyLabel="Non hai ancora foto"
            items={photos}
            linkHref="/mymedia?type=image"
            sectionId="my-photos"
          />
        )}
        <Link
          href={tab === 'video' ? '/mymedia#my-videos' : '/mymedia#my-photos'}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
        >
          <span>Vedi tutti →</span>
        </Link>
      </div>
    </div>
  );
}

function MediaPreviewGrid({
  items,
  emptyLabel,
  linkHref,
  sectionId,
}: {
  items: FeedPost[];
  emptyLabel: string;
  linkHref: string;
  sectionId?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-gray-600" id={sectionId}>
        {emptyLabel}
      </div>
    );
  }

  const thumbs = items.slice(0, 3);

  return (
    <div className="space-y-2 text-xs text-gray-700" id={sectionId}>
      <div className="grid grid-cols-3 gap-2">
        {thumbs.map((item) => (
          <Link
            key={item.id}
            href={`${linkHref}#media-${item.id}`}
            className="group block h-20 overflow-hidden rounded-lg bg-white/60 shadow sm:h-24"
          >
            {item.media_type === 'video' ? (
              <div className="relative h-full w-full bg-black/80">
                <video
                  src={item.media_url ?? undefined}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                  controls={false}
                />
              </div>
            ) : (
              <div className="relative h-full w-full overflow-hidden bg-neutral-100">
                <img
                  src={item.media_url ?? ''}
                  alt="Anteprima"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
