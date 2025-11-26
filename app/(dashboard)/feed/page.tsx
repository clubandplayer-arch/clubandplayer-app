'use client';

/* eslint-disable @next/next/no-img-element */

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import FeedComposer from '@/components/feed/FeedComposer';
import TrackRetention from '@/components/analytics/TrackRetention';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';
import { shareOrCopyLink } from '@/lib/share';
import { PostIconDelete, PostIconEdit, PostIconShare } from '@/components/icons/PostActionIcons';

type ReactionType = 'like' | 'love' | 'care' | 'angry';

type ReactionState = {
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
};

type EventPayload = {
  title: string;
  date: string;
  description?: string | null;
  location?: string | null;
  poster_url?: string | null;
  poster_path?: string | null;
  poster_bucket?: string | null;
};

const REACTION_ORDER: ReactionType[] = ['like', 'love', 'care', 'angry'];
const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  care: '🤗',
  angry: '😡',
};

const defaultReactionState: ReactionState = {
  counts: {
    like: 0,
    love: 0,
    care: 0,
    angry: 0,
  },
  mine: null,
};

function createDefaultReaction(): ReactionState {
  return { ...defaultReactionState, counts: { ...defaultReactionState.counts } };
}

function computeOptimistic(prev: ReactionState, nextMine: ReactionType | null): ReactionState {
  const counts: ReactionState['counts'] = { ...prev.counts };
  if (prev.mine) counts[prev.mine] = Math.max(0, (counts[prev.mine] || 0) - 1);
  if (nextMine) counts[nextMine] = (counts[nextMine] || 0) + 1;
  return { counts, mine: nextMine };
}

function CalendarGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" ry="2" />
      <path d="M4 10h16" />
      <path d="M9 3v4" />
      <path d="M15 3v4" />
    </svg>
  );
}

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

type FeedPost = {
  id: string;
  content?: string;
  text?: string;
  created_at?: string | null;
  createdAt?: string | null;
  author_id?: string | null;
  authorId?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  media_aspect?: '16:9' | '9:16' | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
  kind?: 'normal' | 'event';
  event_payload?: EventPayload | null;
};

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

function normalizePost(p: any): FeedPost {
  const aspect = aspectFromUrl(p?.media_url);
  return {
    id: p.id,
    content: p.content ?? p.text ?? '',
    createdAt: p.created_at ?? p.createdAt ?? null,
    authorId: p.author_id ?? p.authorId ?? null,
    media_url: p.media_url ?? null,
    media_type: p.media_type ?? null,
    media_aspect: normalizeAspect(p.media_aspect) ?? aspect ?? null,
    link_url: p.link_url ?? p.linkUrl ?? firstUrl(p.content ?? p.text ?? null),
    link_title: p.link_title ?? p.linkTitle ?? null,
    link_description: p.link_description ?? p.linkDescription ?? null,
    link_image: p.link_image ?? p.linkImage ?? null,
    kind: p.kind === 'event' ? 'event' : 'normal',
    event_payload: normalizeEventPayload(p.event_payload ?? p.event ?? null),
  };
}

function normalizeAspect(raw?: string | null): '16:9' | '9:16' | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v === '16:9' || v === '16-9') return '16:9';
  if (v === '9:16' || v === '9-16') return '9:16';
  return null;
}

function aspectFromUrl(url?: string | null): '16:9' | '9:16' | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('aspect');
    return normalizeAspect(raw);
  } catch {
    return null;
  }
}

function firstUrl(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function normalizeEventPayload(raw: any): EventPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  if (!title || !date) return null;
  return {
    title,
    date,
    description: typeof raw.description === 'string' ? raw.description.trim() || null : null,
    location: typeof raw.location === 'string' ? raw.location.trim() || null : null,
    poster_url: typeof raw.poster_url === 'string' ? raw.poster_url || null : null,
    poster_path: typeof raw.poster_path === 'string' ? raw.poster_path || null : null,
    poster_bucket: typeof raw.poster_bucket === 'string' ? raw.poster_bucket || null : null,
  };
}

function formatEventDate(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  const hasTime = /\d{2}:\d{2}/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'long' };
  if (hasTime) opts.timeStyle = 'short';
  return new Intl.DateTimeFormat('it-IT', opts).format(date);
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [reactionError, setReactionError] = useState<string | null>(null);
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
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setErr(e?.message ?? 'Errore caricamento bacheca');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [currentUserId, loadReactions]);

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
    <div className="mx-auto max-w-7xl px-4 py-6" aria-labelledby={headingId}>
      {/* layout a 3 colonne: sx (minicard) / centro (composer + post) / dx (suggerimenti) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20%_55%_25%]">
        {/* Colonna sinistra: mini profilo */}
        <aside className="space-y-4">
          <div className="space-y-3">
            {/* Se esiste, il componente reale rimpiazzerà questo blocco via dynamic() */}
            <ProfileMiniCard />
          </div>
          <MyMediaHub currentUserId={currentUserId} posts={items} />
        </aside>

        {/* Colonna centrale: composer + feed */}
        <main className="space-y-4" aria-labelledby={headingId}>
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
              items.map((p) => (
                <PostItem
                  key={p.id}
                  post={p}
                  currentUserId={currentUserId}
                  onUpdated={onPostUpdated}
                  onDeleted={onPostDeleted}
                  reaction={reactions[String(p.id)] ?? createDefaultReaction()}
                  pickerOpen={pickerFor === String(p.id)}
                  onOpenPicker={() => setPickerFor(String(p.id))}
                  onClosePicker={() => setPickerFor((curr) => (curr === String(p.id) ? null : curr))}
                  onToggleReaction={(type) => toggleReaction(String(p.id), type)}
                />
              ))}
            {reactionError && (
              <div className="text-[11px] text-red-600" role="status">
                {reactionError}
              </div>
            )}
          </div>
        </main>

        {/* Colonna destra: suggerimenti/annunci/club seguiti */}
        <aside className="space-y-4">
          <SidebarCard title="Chi seguire">
            <WhoToFollow />
          </SidebarCard>

          <SidebarCard title="Club che segui">
            <FollowedClubs />
          </SidebarCard>

          <SidebarCard title="In evidenza">
            {/* Qui in seguito collegheremo le “opportunità più viste” da Supabase */}
            <div className="text-sm text-gray-600">Prossimamente: opportunità in evidenza</div>
          </SidebarCard>
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

function FeedLinkCard({
  url,
  title,
  description,
  image,
}: {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="block overflow-hidden rounded-xl bg-white/60 shadow-lg transition hover:shadow-xl"
    >
      <div className="flex gap-3 p-3">
        {image ? (
          <img src={image} alt={title || url} className="h-20 w-28 flex-shrink-0 rounded-lg object-cover" />
        ) : null}
        <div className="flex-1 space-y-1">
          <div className="text-xs uppercase text-gray-500">{domainFromUrl(url)}</div>
          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{title || url}</div>
          {description ? <div className="text-xs text-gray-600 line-clamp-2">{description}</div> : null}
        </div>
      </div>
    </a>
  );
}

function FeedVideoPlayer({
  id,
  url,
  showControls = true,
  className,
  onClick,
}: {
  id: string;
  url?: string | null;
  showControls?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(id);

  return (
    <video
      ref={videoRef}
      src={url ?? undefined}
      controls={showControls}
      className={`h-full w-full object-contain ${className ?? ''}`}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={handleEnded}
      onClick={onClick}
      playsInline
    />
  );
}

function PostItem({
  post,
  currentUserId,
  onUpdated,
  onDeleted,
  reaction,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onToggleReaction,
}: {
  post: FeedPost;
  currentUserId: string | null;
  onUpdated?: (next: FeedPost) => void;
  onDeleted?: (id: string) => void;
  reaction: ReactionState;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onToggleReaction: (type: ReactionType) => void;
}) {
  const isEvent = (post.kind ?? 'normal') === 'event';
  const eventDetails = post.event_payload;
  const baseDescription = post.content ?? post.text ?? '';
  const description = isEvent
    ? baseDescription || eventDetails?.description || ''
    : baseDescription;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkUrl = post.link_url ?? firstUrl(description);
  const linkTitle = post.link_title ?? null;
  const linkDescription = post.link_description ?? null;
  const linkImage = post.link_image ?? null;
  const isOwner = currentUserId != null && post.authorId === currentUserId;
  const editAreaId = `post-edit-${post.id}`;
  const errorId = error ? `post-error-${post.id}` : undefined;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const eventDateLabel = eventDetails?.date ? formatEventDate(eventDetails.date) : null;
  const mediaLabel = isEvent ? 'Evento' : post.media_type === 'video' ? 'Video' : 'Foto';
  const mediaAria = isEvent ? "Apri la locandina dell'evento" : 'Apri il media in grande';

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/feed?post=${post.id}`;
  }, [post.id]);

  const handleShare = useCallback(() => {
    void shareOrCopyLink({
      title: isEvent ? 'Evento del club' : 'Post del feed',
      text: isEvent ? eventDetails?.title ?? description : description || undefined,
      url: shareUrl,
    });
  }, [description, eventDetails?.title, isEvent, shareUrl]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!editing) setText(description);
  }, [description, editing, post]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeLightbox, lightboxOpen]);

  async function saveEdit() {
    const payload = text.trim();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.item) throw new Error(json?.error || 'Salvataggio fallito');
      onUpdated?.(normalizePost(json.item));
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Eliminazione fallita');
      onDeleted?.(post.id);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="glass-panel relative p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <div>{post.createdAt ? new Date(post.createdAt).toLocaleString() : '—'}</div>
          {isEvent && eventDateLabel ? (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-blue-800">
              <CalendarGlyph className="h-3.5 w-3.5" aria-hidden />
              <span>{eventDateLabel}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-neutral-500">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full p-2 transition hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Modifica questo post"
                disabled={saving}
              >
                <PostIconEdit className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={deletePost}
                className="rounded-full p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Elimina questo post"
                disabled={saving}
              >
                <PostIconDelete className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full p-2 transition hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={isEvent ? 'Condividi questo evento' : 'Condividi questo post'}
          >
            <PostIconShare className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <label htmlFor={editAreaId} className="sr-only">
            Modifica il contenuto del post
          </label>
          <textarea
            id={editAreaId}
            className="w-full resize-y rounded-lg border px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={saving}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="rounded-lg bg-gray-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setText(post.content ?? post.text ?? '');
              }}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
              disabled={saving}
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <>
          {isEvent && eventDetails ? (
            <div className="mt-2 space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase text-blue-800 shadow-sm">
                    <CalendarGlyph className="h-3.5 w-3.5" aria-hidden />
                    <span>Evento</span>
                  </div>
                  <div className="text-base font-semibold text-gray-900">{eventDetails.title}</div>
                </div>
                {eventDateLabel ? (
                  <div className="text-right text-xs font-semibold text-blue-900">{eventDateLabel}</div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                {eventDetails.location ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
                    📍 <span>{eventDetails.location}</span>
                  </span>
                ) : null}
              </div>
              {description ? (
                <div className="whitespace-pre-wrap text-sm text-gray-800">{description}</div>
              ) : null}
            </div>
          ) : description ? (
            <div className="mt-1 whitespace-pre-wrap text-sm">{description}</div>
          ) : null}
        </>
      )}
      {linkUrl ? (
        <div className="mt-3">
          <FeedLinkCard url={linkUrl} title={linkTitle} description={linkDescription} image={linkImage} />
        </div>
      ) : null}
      {post.media_url ? (
        <div className="mt-3 flex w-full justify-center">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative w-full max-w-[560px] cursor-zoom-in overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            aria-label={mediaAria}
          >
            <div className="relative flex aspect-[4/5] w-full items-center justify-center bg-neutral-900/5">
              {post.media_type === 'video' ? (
                <FeedVideoPlayer
                  id={`${post.id}-preview`}
                  url={post.media_url}
                  showControls={false}
                  className="bg-black"
                />
              ) : (
                <img src={post.media_url} alt="Allegato" className="h-full w-full object-contain" />
              )}
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                {mediaLabel}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          </button>
        </div>
      ) : null}

      <div
        className="mt-3 flex flex-col gap-1 text-[11px] text-neutral-700"
        onMouseLeave={onClosePicker}
      >
        <div className="relative inline-flex w-full max-w-xs items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleReaction('like')}
            onMouseEnter={onOpenPicker}
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
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition ${
                    reaction.mine === r ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'hover:bg-neutral-100'
                  }`}
                >
                  <span aria-hidden>{REACTION_EMOJI[r]}</span>
                  <span className="capitalize">{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {(() => {
          const summaryParts = REACTION_ORDER.filter((key) => (reaction.counts[key] || 0) > 0).map(
            (key) => `${REACTION_EMOJI[key]} ${reaction.counts[key]}`,
          );
          const total = REACTION_ORDER.reduce((acc, key) => acc + (reaction.counts[key] || 0), 0);
          const summaryText = summaryParts.length ? summaryParts.join(' · ') : 'Nessuna reazione';

          return (
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
          );
        })()}
      </div>
      {error ? (
        <div id={errorId} className="mt-2 text-xs text-red-600" role="status">
          {error}
        </div>
      ) : null}

      {lightboxOpen && post.media_url ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Media a schermo intero"
        >
          <div
            className="absolute inset-0"
            onClick={closeLightbox}
            aria-hidden
            role="presentation"
          />

          <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-3">
            <button
              type="button"
              onClick={closeLightbox}
              className="self-end rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white shadow-lg ring-1 ring-white/30 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Chiudi
            </button>
            <div className="relative flex max-h-[90vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 p-2 shadow-2xl">
              {post.media_type === 'video' ? (
                <FeedVideoPlayer
                  id={`${post.id}-lightbox`}
                  url={post.media_url}
                  className="max-h-[85vh] w-full object-contain bg-black"
                />
              ) : (
                <img
                  src={post.media_url}
                  alt="Allegato"
                  className="max-h-[85vh] w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
