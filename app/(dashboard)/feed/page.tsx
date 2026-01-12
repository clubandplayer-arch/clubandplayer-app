'use client';

/* eslint-disable @next/next/no-img-element */

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import FeedComposer from '@/components/feed/FeedComposer';
import TrackRetention from '@/components/analytics/TrackRetention';
import { PostCard } from '@/components/feed/PostCard';
import EmptyState from '@/components/common/EmptyState';
import AdSlot from '@/components/ads/AdSlot';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import {
  computeOptimistic,
  createDefaultReaction,
  defaultReactionState,
  REACTION_ORDER,
  type FeedPost,
  type ReactionState,
  type ReactionType,
} from '@/components/feed/postShared';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import useFeed, { type FeedScope } from '@/hooks/useFeed';
import type { Opportunity } from '@/types/opportunity';
import type { Profile } from '@/types/profile';

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

type StarterProfile = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  account_type?: string | null;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

export default function FeedPage() {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [_profile, setProfile] = useState<Profile | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const seenPostIds = useRef<Set<string>>(new Set());
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const headingId = 'feed-heading';
  const [starterPack, setStarterPack] = useState<{
    opportunities: Opportunity[];
    profiles: StarterProfile[];
  } | null>(null);
  const [starterPackLoading, setStarterPackLoading] = useState(false);
  const [starterPackError, setStarterPackError] = useState<string | null>(null);

  const {
    posts: feedPosts,
    scope,
    setScope,
    isInitialLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    refresh,
    updatePost,
    removePost,
  } = useFeed();
  const posts = feedPosts;
  const errorMessage = error?.message ?? null;
  const canCreatePost = Boolean(currentUserId);
  const shouldShowEmptyState = !isInitialLoading && !errorMessage && posts.length === 0;

  useInfiniteScroll<HTMLDivElement>(loadMoreSentinelRef, {
    enabled: !isInitialLoading && !errorMessage && posts.length > 0 && hasNextPage,
    hasNextPage,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });
  const userRole =
    _profile?.account_type === 'club' || _profile?.account_type === 'athlete'
      ? _profile.account_type
      : 'guest';
  const shouldShowStarterPack = !isInitialLoading && !errorMessage && posts.length < 3;

  const handleRefresh = useCallback(async () => {
    setReactions({});
    setCommentCounts({});
    seenPostIds.current = new Set();
    await refresh();
  }, [refresh]);

  const handleFocusComposer = useCallback(() => {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('feed-composer-input') as HTMLTextAreaElement | null;
    if (!input) return;
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

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

  useEffect(() => {
    setReactions({});
    setCommentCounts({});
    seenPostIds.current = new Set();
  }, [scope]);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => null);
        const id = j?.user?.id ?? null;
        const rawProfile = j?.profile ?? null;
        setCurrentUserId(id);
        let nextProfile = rawProfile ?? null;

        if (id) {
          try {
            const profileRes = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
            const profileJson = await profileRes.json().catch(() => null);
            if (profileRes.ok && profileJson?.data) {
              nextProfile = profileJson.data as Profile;
            }
          } catch {
            // ignora eventuali errori del profilo dettagliato
          }
        }

        setProfile(nextProfile);
      } catch {
        setCurrentUserId(null);
        setProfile(null);
      }
    }
    void loadUser();
  }, []);

  useEffect(() => {
    const ids = posts.map((p) => String(p.id)).filter(Boolean);
    const prev = seenPostIds.current;
    const fresh = ids.filter((id) => !prev.has(id));

    if (fresh.length) {
      void loadReactions(fresh);
      void loadCommentCounts(fresh);
    }

    seenPostIds.current = new Set(ids);
  }, [posts, loadReactions, loadCommentCounts]);

  useEffect(() => {
    if (!shouldShowStarterPack) {
      setStarterPack(null);
      setStarterPackError(null);
      setStarterPackLoading(false);
      return;
    }
    if (starterPack || starterPackLoading) return;

    let cancelled = false;
    (async () => {
      setStarterPackLoading(true);
      setStarterPackError(null);
      try {
        const res = await fetch('/api/feed/starter-pack', {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setStarterPack({
          opportunities: Array.isArray(json?.opportunities) ? json.opportunities : [],
          profiles: Array.isArray(json?.profiles) ? json.profiles : [],
        });
      } catch (err: any) {
        if (!cancelled) {
          setStarterPackError(err?.message || 'Impossibile caricare i suggerimenti.');
        }
      } finally {
        if (!cancelled) setStarterPackLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldShowStarterPack, starterPack, starterPackLoading]);

  const handleScopeChange = useCallback(
    (next: FeedScope) => {
      if (next === scope) return;
      setScope(next);
    },
    [scope, setScope],
  );

  function onPostUpdated(next: FeedPost) {
    updatePost(next);
  }

  function onPostDeleted(id: string) {
    removePost(id);
  }

  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-4 sm:px-5 md:px-6 lg:px-6"
      aria-labelledby={headingId}
    >
      {/* layout a 3 colonne: sx (minicard) / centro (composer + post) / dx (suggerimenti) */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-[280px_minmax(0,2.2fr)_minmax(0,1.2fr)] xl:grid-cols-[300px_minmax(0,2.5fr)_minmax(0,1.3fr)] md:items-stretch">
        {/* Colonna sinistra: mini profilo */}
        <aside className="min-w-0 space-y-4 md:self-stretch md:min-h-full">
          <div className="space-y-3">
            {/* Se esiste, il componente reale rimpiazzerà questo blocco via dynamic() */}
            <ProfileMiniCard />
          </div>
          <MyMediaHub currentUserId={currentUserId} />
          <div className="space-y-4 md:sticky md:top-24" data-ads-sticky="left">
            <AdSlot slot="left_top" page={pathname} imageAspect="landscape" />
            <AdSlot slot="left_extra" page={pathname} imageAspect="landscape" />
            <AdSlot slot="left_bottom" page={pathname} imageAspect="landscape" />
          </div>
        </aside>

        {/* Colonna centrale: composer + feed */}
        <main className="min-w-0 space-y-4" aria-labelledby={headingId}>
          <TrackRetention scope="feed" />
          <h1 id={headingId} className="sr-only">
            Bacheca feed
          </h1>
          <div className="glass-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-neutral-700">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Visibilità</div>
            <div
              className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm"
              role="group"
              aria-label="Filtra feed"
            >
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${scope === 'all' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
                onClick={() => handleScopeChange('all')}
                aria-pressed={scope === 'all'}
              >
                Tutti
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${scope === 'following' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
                onClick={() => handleScopeChange('following')}
                aria-pressed={scope === 'following'}
              >
                Seguiti
              </button>
            </div>
          </div>
          <FeedComposer onPosted={handleRefresh} />

          <div className="space-y-4" aria-live="polite" aria-busy={isInitialLoading}>
            {isInitialLoading && (
              <div className="glass-panel p-4" role="status">
                Caricamento…
              </div>
            )}
            {errorMessage && (
              <div className="glass-panel p-4 text-red-600" role="alert">
                {errorMessage}
              </div>
            )}
            {shouldShowEmptyState && (
              <EmptyState
                title="Il feed è ancora vuoto"
                description="Inizia pubblicando un post o scopri club e player nella tua zona."
                actions={[
                  { label: 'Cerca su mappa', href: '/search-map', variant: 'primary' },
                  { label: 'Scopri opportunità', href: '/opportunities', variant: 'secondary' },
                  ...(canCreatePost
                    ? [{ label: 'Crea un post', onClick: handleFocusComposer, variant: 'secondary' as const }]
                    : []),
                ]}
              />
            )}
            {!isInitialLoading &&
              !errorMessage &&
              posts.map((p, index) => (
                <Fragment key={p.id}>
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
                  {(index + 1) % 2 === 0 ? <AdSlot slot="feed_infeed" page={pathname} /> : null}
                </Fragment>
              ))}
            {shouldShowStarterPack && (
              <StarterPackSection
                loading={starterPackLoading}
                error={starterPackError}
                opportunities={starterPack?.opportunities ?? []}
                profiles={starterPack?.profiles ?? []}
                userRole={userRole}
                currentUserId={currentUserId}
              />
            )}
            <div ref={loadMoreSentinelRef} aria-hidden className="h-1" />
            {!isInitialLoading && !errorMessage && posts.length > 0 && (
              <div className="flex justify-center">
                {hasNextPage ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Caricamento…' : 'Carica altri'}
                  </button>
                ) : (
                  <div className="text-center text-xs text-neutral-500">Hai visto tutti i post</div>
                )}
              </div>
            )}
            {reactionError && (
              <div className="text-[11px] text-red-600" role="status">
                {reactionError}
              </div>
            )}
          </div>
        </main>

        {/* Colonna destra: suggerimenti/annunci/club seguiti */}
        <aside className="min-w-0 space-y-4 md:self-stretch md:min-h-full">
          <SidebarCard>
            <WhoToFollow />
          </SidebarCard>

          <SidebarCard>
            <FollowedClubs />
          </SidebarCard>

          <SidebarCard>
            <FeedHighlights />
          </SidebarCard>

          <div className="space-y-4 md:sticky md:top-24" data-ads-sticky="right">
            <AdSlot slot="sidebar_top" page={pathname} imageAspect="portrait" />
          </div>
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

type MediaType = 'image' | 'video' | null;

function normalizeMediaType(raw?: string | null): MediaType {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === 'image' || value === 'photo') return 'image';
  if (value === 'video') return 'video';
  if (value.startsWith('image/')) return 'image';
  if (value.startsWith('video/')) return 'video';
  return null;
}

function inferMediaTypeFromUrl(url?: string | null): MediaType {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (/\.(mp4|mov|avi|mkv)(\?|$)/.test(lower)) return 'video';
  if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/.test(lower)) return 'image';
  return null;
}

type MediaPreviewItem = Pick<FeedPost, 'id' | 'media_url' | 'media_type'>;

function normalizePreviewPost(post: FeedPost): MediaPreviewItem {
  const normalizedType =
    normalizeMediaType(post.media_type ?? null) ?? inferMediaTypeFromUrl(post.media_url ?? null);
  return {
    id: post.id,
    media_url: post.media_url ?? null,
    media_type: normalizedType,
  };
}

async function fetchMyMediaPreview(authorId: string, signal?: AbortSignal): Promise<MediaPreviewItem[]> {
  const params = new URLSearchParams({ authorId, limit: '30' });
  const res = await fetch(`/api/feed/posts?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  const items = Array.isArray(json?.items ?? json?.data) ? (json.items ?? json.data) : [];
  return items.map((item: FeedPost) => normalizePreviewPost(item));
}

function MyMediaHub({ currentUserId }: { currentUserId: string | null }) {
  const [tab, setTab] = useState<'video' | 'photo'>('video');
  const [previewItems, setPreviewItems] = useState<MediaPreviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetchMyMediaPreview(currentUserId, ctrl.signal)
      .then((items) => {
        if (!ctrl.signal.aborted) setPreviewItems(items);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setPreviewItems([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [currentUserId]);

  const videos = useMemo(
    () => previewItems.filter((p) => p.media_type === 'video' && p.media_url).slice(0, 3),
    [previewItems],
  );
  const photos = useMemo(
    () => previewItems.filter((p) => p.media_type === 'image' && p.media_url).slice(0, 3),
    [previewItems],
  );

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
            className={`rounded-full px-3 py-1 ${tab === 'photo' ? 'bg-gray-900 text-white' : 'bg-white/60'}`}
            onClick={() => setTab('photo')}
          >
            MyPhoto
          </button>
        </div>
      </div>
      <div className="px-4 pb-4">
        {tab === 'video' ? (
          <MediaPreviewGrid
            emptyLabel={loading ? 'Caricamento…' : 'Non hai ancora video'}
            items={videos}
            linkHref={currentUserId ? `/mymedia?type=video&authorId=${currentUserId}` : '/mymedia?type=video'}
            sectionId="my-videos"
          />
        ) : (
          <MediaPreviewGrid
            emptyLabel={loading ? 'Caricamento…' : 'Non hai ancora foto'}
            items={photos}
            linkHref={currentUserId ? `/mymedia?type=photo&authorId=${currentUserId}` : '/mymedia?type=photo'}
            sectionId="my-photos"
          />
        )}
        <Link
          href={
            tab === 'video'
              ? currentUserId
                ? `/mymedia?type=video&authorId=${currentUserId}#my-videos`
                : '/mymedia?type=video#my-videos'
              : currentUserId
                ? `/mymedia?type=photo&authorId=${currentUserId}#my-photos`
                : '/mymedia?type=photo#my-photos'
          }
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

function StarterPackSection({
  loading,
  error,
  opportunities,
  profiles,
  userRole,
  currentUserId,
}: {
  loading: boolean;
  error: string | null;
  opportunities: Opportunity[];
  profiles: StarterProfile[];
  userRole: 'club' | 'athlete' | 'guest';
  currentUserId: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Opportunità consigliate</h2>
            <p className="text-xs text-neutral-500">Una selezione veloce per riempire il feed.</p>
          </div>
          <Link href="/opportunities" className="text-xs font-semibold text-blue-700 hover:underline">
            Vedi tutte →
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : opportunities.length > 0 ? (
          <div className="mt-4 space-y-3">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                _currentUserId={currentUserId}
                userRole={userRole}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-neutral-600">Nessuna opportunità consigliata al momento.</div>
        )}
      </div>

      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Profili consigliati</h2>
            <p className="text-xs text-neutral-500">Club e player in linea con il tuo profilo.</p>
          </div>
          <Link href="/search-map" className="text-xs font-semibold text-blue-700 hover:underline">
            Cerca su mappa →
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                <div className="h-10 w-10 rounded-full bg-neutral-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-neutral-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {profiles.map((profile) => {
              const name = profile.full_name?.trim() || profile.display_name?.trim() || 'Profilo';
              const detail =
                [profile.role, profile.sport].filter(Boolean).join(' · ') ||
                [profile.city, profile.country].filter(Boolean).join(', ') ||
                'Profilo consigliato';
              const profileHref =
                profile.account_type === 'club' ? `/clubs/${profile.id}` : `/players/${profile.id}`;
              return (
                <li key={profile.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                  <img
                    src={
                      profile.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
                    }
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={profileHref} className="block truncate text-sm font-semibold text-neutral-900 hover:underline">
                      {name}
                    </Link>
                    <div className="truncate text-xs text-neutral-500">{detail}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 text-sm text-neutral-600">Nessun profilo consigliato al momento.</div>
        )}
      </div>

      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
