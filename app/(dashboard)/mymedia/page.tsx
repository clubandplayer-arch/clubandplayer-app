'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Lightbox, type LightboxItem } from '@/components/media/Lightbox';
import Link from 'next/link';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';
import { shareOrCopyLink } from '@/lib/share';
import ShareIcon from '@/components/icons/ShareIcon';

const DEFAULT_LIMIT = 100;

type MediaPost = {
  id: string;
  created_at?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  media_aspect?: '16:9' | '9:16' | null;
  content?: string | null;
  link_url?: string | null;
};

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
  return {
    id: p.id,
    created_at: p.created_at ?? p.createdAt ?? null,
    media_url: p.media_url ?? null,
    media_type: p.media_type ?? null,
    media_aspect: normalizeAspect(p.media_aspect) ?? aspectFromUrl(p.media_url) ?? null,
    content: p.content ?? p.text ?? null,
    link_url: p.link_url ?? null,
  };
}

async function fetchMyMedia(signal?: AbortSignal): Promise<MediaPost[]> {
  const res = await fetch(`/api/feed/posts?mine=1&limit=${DEFAULT_LIMIT}`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({} as any));
  const arr = Array.isArray(j?.items ?? j?.data) ? (j.items ?? j.data) : [];
  return arr.map(normalizePost);
}

function buildMediaShareUrl(item: MediaPost) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (item.media_url) return item.media_url;
  return origin ? `${origin}/mymedia#media-${item.id}` : '';
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

  const videos = useMemo(() => items.filter((i) => i.media_type === 'video' && i.media_url), [items]);
  const photos = useMemo(() => items.filter((i) => i.media_type === 'image' && i.media_url), [items]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

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
    alt: item.caption ?? item.display_name ?? 'Media',
  }));

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
          <MediaSection id="my-videos" title="MyVideo" items={videos} />
          <MediaSection
            id="my-photos"
            title="MyPhoto"
            items={photos}
            onImageClick={(index) => setLightboxIndex(index)}
          />
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
  const aspectClass = aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]';
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(id);
  return (
    <div className={`${aspectClass} w-full overflow-hidden rounded-t-xl bg-black/80 max-h-[34vh] md:max-h-[30vh]`}>
      <video
        ref={videoRef}
        src={url ?? undefined}
        controls
        className="h-full w-full object-contain"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />
    </div>
  );
}
