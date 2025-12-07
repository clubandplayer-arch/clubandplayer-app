'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Lightbox, type LightboxItem } from '@/components/media/Lightbox';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';
import { shareOrCopyLink } from '@/lib/share';
import ShareIcon from '@/components/icons/ShareIcon';

const DEFAULT_LIMIT = 100;

type MediaType = 'image' | 'video' | null;

type MediaPost = {
  id: string;
  created_at?: string | null;
  media_url?: string | null;
  media_type?: MediaType;
  media_aspect?: '16:9' | '9:16' | null;
  content?: string | null;
  link_url?: string | null;
};

type MediaSectionConfig = {
  id: string;
  title: string;
  items: MediaPost[];
  onImageClick?: (index: number, item: MediaPost) => void;
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

  const selectedType: 'photo' | 'video' = useMemo(() => {
    const raw = searchParams?.get('type');
    return raw === 'video' ? 'video' : 'photo';
  }, [searchParams]);

  const sections: MediaSectionConfig[] = useMemo(
    () => [
      { id: 'my-videos', title: 'MyVideo', items: videos },
      { id: 'my-photos', title: 'MyPhoto', items: photos, onImageClick: handlePhotoClick },
    ],
    [videos, photos, handlePhotoClick],
  );

  const orderedSections =
    selectedType === 'photo' ? [sections[1], sections[0]] : sections;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <div className="flex justify-end">
        <Link href="/feed" className="text-sm font-semibold text-blue-700">
          Torna al feed →
        </Link>
      </div>

      {loading && <div className="glass-panel p-4">Caricamento…</div>}
      {err && <div className="glass-panel p-4 text-red-600">{err}</div>}

      {!loading && !err && (
        <div className="space-y-4">
          {orderedSections.map((section) => (
            <MediaSection key={section.id} {...section} />
          ))}
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
  );
}

function MediaSection({
  id,
  title,
  items,
  onImageClick,
}: {
  id: string;
  title: string;
  items: MediaPost[];
  onImageClick?: (index: number, item: MediaPost) => void;
}) {
  return (
    <section id={id} className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-xs text-gray-500">{items.length} elementi</span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">Nessun contenuto ancora.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((item, index) => (
            <article
              id={`media-${item.id}`}
              key={item.id}
              className="relative overflow-hidden rounded-xl bg-white/60 shadow-inner"
            >
              <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    shareOrCopyLink({
                      title: title,
                      text: item.content ?? undefined,
                      url: buildMediaShareUrl(item),
                    })
                  }
                  className="inline-flex items-center justify-center rounded-full bg-white/90 p-2 text-neutral-800 shadow hover:bg-white"
                  aria-label={`Condividi ${item.media_type === 'video' ? 'questo video' : 'questa foto'}`}
                >
                  <ShareIcon className="h-4 w-4" />
                </button>
              </div>

              {item.media_type === 'video' ? (
                <VideoPlayer url={item.media_url} aspect={item.media_aspect} id={item.id} />
              ) : (
                <button
                  type="button"
                  className="group relative block h-48 w-full overflow-hidden rounded-t-xl focus:outline-none focus:ring-2 focus:ring-blue-600 md:h-56"
                  onClick={() => onImageClick?.(index, item)}
                >
                  <img
                    src={item.media_url ?? ''}
                    alt="Anteprima"
                    className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.02]"
                  />
                </button>
              )}

              {item.content ? (
                <p className="px-3 pb-3 pt-2 text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
              ) : null}
              {item.link_url ? (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block px-3 pb-3 text-sm font-semibold text-blue-700"
                >
                  Apri link esterno →
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function VideoPlayer({
  url,
  aspect,
  id,
}: {
  url?: string | null;
  aspect?: '16:9' | '9:16' | null;
  id: string;
}) {
  const aspectClass = aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video';
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(id);

  return (
    <div className={`${aspectClass} relative w-full overflow-hidden rounded-t-xl bg-black`}>
      <video
        ref={videoRef}
        src={url ?? undefined}
        controls
        playsInline
        className="absolute inset-0 h-full w-full object-contain"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />
    </div>
  );
}
