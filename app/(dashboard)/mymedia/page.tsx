'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Lightbox, type LightboxItem } from '@/components/media/Lightbox';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';
import { shareOrCopyLink } from '@/lib/share';
import { ShareButton } from '@/components/media/ShareButton';
import { ShareSectionButton } from '@/components/media/ShareSectionButton';
import { MediaEmptyState } from '@/components/media/MediaEmptyState';
import { MaterialIcon } from '@/components/icons/MaterialIcon';

const DEFAULT_LIMIT = 100;

type MediaType = 'image' | 'video' | null;
type MediaTab = 'video' | 'photo';

type MediaPost = {
  id: string;
  created_at?: string | null;
  media_url?: string | null;
  media_type?: MediaType;
  media_aspect?: '16:9' | '9:16' | null;
  content?: string | null;
  link_url?: string | null;
};

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

function normalizePost(p: any): MediaPost {
  const mediaType =
    normalizeMediaType(p.media_type ?? p.mediaType ?? p.media_mime ?? p.mediaMime ?? null) ??
    inferMediaTypeFromUrl(p.media_url);
  return {
    id: p.id,
    created_at: p.created_at ?? p.createdAt ?? null,
    media_url: p.media_url ?? null,
    media_type: mediaType,
    media_aspect: normalizeAspect(p.media_aspect) ?? aspectFromUrl(p.media_url) ?? null,
    content: p.content ?? p.text ?? null,
    link_url: p.link_url ?? null,
  };
}

async function fetchMyMedia(signal?: AbortSignal): Promise<MediaPost[]> {
  const res = await fetch(`/api/feed/posts?mine=true&limit=${DEFAULT_LIMIT}`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[mymedia] fetch failed', res.status, body);
    throw new Error('Impossibile caricare i tuoi media');
  }
  const j = await res.json().catch(() => ({} as any));
  const arr = Array.isArray(j?.items ?? j?.data) ? (j.items ?? j.data) : [];
  console.info('[mymedia] response', {
    status: res.status,
    ok: res.ok,
    apiOk: j?.ok ?? null,
    code: j?.code ?? null,
    message: j?.message ?? null,
    itemsLength: arr.length,
  });
  console.info('[mymedia] total posts fetched', arr.length);
  return arr.map(normalizePost);
}

function resolveMediaType(post: MediaPost): MediaType {
  return normalizeMediaType(post.media_type) ?? inferMediaTypeFromUrl(post.media_url);
}

function isPhotoPost(post: MediaPost): boolean {
  if (!post.media_url) return false;
  return resolveMediaType(post) === 'image';
}

function isVideoPost(post: MediaPost): boolean {
  if (!post.media_url) return false;
  return resolveMediaType(post) === 'video';
}

function buildMediaShareUrl(item: MediaPost) {
  const typeParam = item.media_type === 'video' ? 'video' : 'photo';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (item.media_url) return item.media_url;
  const search = origin ? `?type=${typeParam}` : '';
  return origin ? `${origin}/mymedia${search}#media-${item.id}` : '';
}

export default function MyMediaPage() {
  const [items, setItems] = useState<MediaPost[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await fetchMyMedia(ctrl.signal);
        setItems(data);
      } catch (e: any) {
        if (!ctrl.signal.aborted) setErr(e?.message || 'Errore nel caricamento dei media');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const videos = useMemo(() => items.filter(isVideoPost), [items]);
  const photos = useMemo(() => items.filter(isPhotoPost), [items]);

  useEffect(() => {
    if (loading) return;
    console.info('[mymedia] totals', {
      posts: items.length,
      photos: photos.length,
      videos: videos.length,
    });
  }, [items.length, photos.length, videos.length, loading]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const searchParams = useSearchParams();

  const activeTab: MediaTab = useMemo(() => {
    const type = searchParams?.get('type');
    return type === 'photo' ? 'photo' : 'video';
  }, [searchParams]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const handlePhotoClick = useCallback((index: number) => setLightboxIndex(index), []);

  const showPrev = useCallback(() => {
    setLightboxIndex((idx) => {
      if (idx === null) return idx;
      if (photos.length === 0) return idx;
      return idx === 0 ? photos.length - 1 : idx - 1;
    });
  }, [photos.length]);

  const showNext = useCallback(() => {
    setLightboxIndex((idx) => {
      if (idx === null) return idx;
      if (photos.length === 0) return idx;
      return idx === photos.length - 1 ? 0 : idx + 1;
    });
  }, [photos.length]);

  const photoItems: LightboxItem[] = photos.map((item) => ({
    url: item.media_url ?? '',
    type: 'image',
    alt: item.content ?? 'Media',
  }));

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-5xl px-4 md:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-cp-brand">La tua libreria media</h1>
            <p className="text-sm text-cp-brand-soft">
              Rivedi e condividi i tuoi video e le tue foto pubblicati nel feed.
            </p>
          </div>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 rounded-full border border-cp-brand-soft px-3 py-1.5 text-sm font-semibold text-cp-brand transition hover:bg-blue-50"
          >
            Torna al feed
          </Link>
        </div>

        <div className="mt-4 mb-6 flex items-center gap-4 border-b border-border">
          <TabLink label="Video" isActive={activeTab === 'video'} href="/mymedia?type=video#my-videos" />
          <TabLink label="Foto" isActive={activeTab === 'photo'} href="/mymedia?type=photo#my-photos" />
        </div>

        {loading && <div className="glass-panel p-4">Caricamento…</div>}
        {err && <div className="glass-panel p-4 text-red-600">{err}</div>}

        {!loading && !err && (
          <div className="space-y-8">
            {activeTab === 'video' ? (
              <MediaSection id="my-videos" title="MyVideo" items={videos} tab="video" />
            ) : null}
            {activeTab === 'photo' ? (
              <MediaSection id="my-photos" title="MyPhoto" items={photos} tab="photo" onImageClick={handlePhotoClick} />
            ) : null}
          </div>
        )}

        {lightboxIndex !== null && photoItems[lightboxIndex] ? (
          <Lightbox
            items={photoItems}
            index={lightboxIndex}
            onClose={closeLightbox}
            onPrev={showPrev}
            onNext={showNext}
          />
        ) : null}
      </div>
    </div>
  );
}

function TabLink({ label, isActive, href }: { label: string; isActive: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`border-b-2 pb-2 text-sm transition-colors ${
        isActive
          ? 'border-cp-brand font-medium text-cp-brand'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}

function MediaSection({
  id,
  title,
  items,
  tab,
  onImageClick,
}: {
  id: string;
  title: string;
  items: MediaPost[];
  tab: MediaTab;
  onImageClick?: (index: number, item: MediaPost) => void;
}) {
  const isVideoSection = tab === 'video';
  const iconName = isVideoSection ? 'video' : 'photo';

  return (
    <section id={id} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name={iconName} className="text-lg" />
          <h2 className="text-xl font-semibold">{title}</h2>
          <span className="text-sm text-cp-brand-soft">{items.length} elementi</span>
        </div>
        <ShareSectionButton activeTab={tab} />
      </div>
      <div className="glass-panel p-4 rounded-xl shadow-sm">
        {items.length === 0 ? (
          <MediaEmptyState kind={tab} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item, index) => (
              <article
                id={`media-${item.id}`}
                key={item.id}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-cp-brand-soft bg-background shadow-sm transition-transform transition-shadow hover:scale-[1.01] hover:shadow-md"
              >
                <div className="flex h-full flex-col">
                  <div className="overflow-hidden rounded-b-none">
                    {item.media_type === 'video' ? (
                      <VideoPlayer
                        url={item.media_url}
                        aspect={item.media_aspect}
                        id={item.id}
                        title={item.content ?? undefined}
                      />
                    ) : (
                      <button
                        type="button"
                        className="group relative block w-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        onClick={() => onImageClick?.(index, item)}
                      >
                        <div className="relative w-full aspect-[4/5] bg-black/5">
                          <img
                            src={item.media_url ?? ''}
                            alt="Anteprima"
                            className="absolute inset-0 h-full w-full object-contain transition duration-150 group-hover:scale-[1.02]"
                          />
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 px-3 pb-3 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1 whitespace-pre-wrap text-sm font-medium text-foreground line-clamp-2">
                        {item.content || ''}
                      </p>
                      <ShareButton
                        onClick={() =>
                          shareOrCopyLink({
                            title: title,
                            text: item.content ?? undefined,
                            url: buildMediaShareUrl(item),
                          })
                        }
                        ariaLabel={`Condividi ${item.media_type === 'video' ? 'questo video' : 'questa foto'}`}
                        className="shrink-0"
                      />
                    </div>
                    {item.link_url ? (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block text-sm font-semibold text-cp-brand"
                      >
                        Apri link esterno →
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function VideoPlayer({
  url,
  aspect,
  id,
  title,
}: {
  url?: string | null;
  aspect?: '16:9' | '9:16' | null;
  id: string;
  title?: string;
}) {
  const aspectClass = aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video';
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(id);

  return (
    <div className={`${aspectClass} relative w-full overflow-hidden bg-black`}>
      <video
        ref={videoRef}
        src={url ?? undefined}
        controls
        playsInline
        className="absolute inset-0 h-full w-full object-contain"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        title={title}
      />
      {title ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 pb-1 pt-4 text-xs text-white bg-gradient-to-t from-black/60 to-transparent">
          <span className="truncate pr-2">{title}</span>
        </div>
      ) : null}
    </div>
  );
}
