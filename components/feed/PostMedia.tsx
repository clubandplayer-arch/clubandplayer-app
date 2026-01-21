'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Lightbox, type LightboxItem } from '@/components/media/Lightbox';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';
import type { PostMediaItem } from '@/components/feed/postShared';

type Props = {
  postId: string;
  media?: PostMediaItem[] | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  alt?: string | null;
};

export function PostMedia({ postId, media, mediaUrl, mediaType, alt }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fallbackMedia: PostMediaItem[] =
    !media?.length && mediaUrl && mediaType
      ? [
          {
            id: null,
            url: mediaUrl,
            media_type: mediaType,
            mediaType,
            poster_url: null,
            posterUrl: null,
            width: null,
            height: null,
            position: 0,
          },
        ]
      : [];
  const itemsSource = media?.length ? media : fallbackMedia;
  const aria = alt || (itemsSource?.[0]?.media_type === 'video' ? 'Guarda il video' : 'Apri il media');
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(postId);

  const items = useMemo<LightboxItem[]>(() => {
    if (!itemsSource?.length) return [];
    return itemsSource.map((item) => ({
      url: item.url,
      type: item.media_type,
      alt: alt || undefined,
    }));
  }, [alt, itemsSource]);

  if (!itemsSource?.length) return null;

  const mediaCount = itemsSource.length;
  const collageItems = itemsSource.slice(0, 4);
  const extraCount = itemsSource.length - collageItems.length;

  const renderPreview = (item: PostMediaItem, fitClass: string) => {
    const previewUrl = item.media_type === 'video' ? item.poster_url ?? item.posterUrl ?? null : item.url;
    if (item.media_type === 'image') {
      return (
        <Image
          src={item.url}
          alt={aria}
          fill
          sizes="(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 560px, 100vw"
          className={`${fitClass} object-center`}
        />
      );
    }
    if (previewUrl) {
      return (
        <Image
          src={previewUrl}
          alt={aria}
          fill
          sizes="(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 560px, 100vw"
          className={`${fitClass} object-center`}
        />
      );
    }
    return (
      <video
        ref={videoRef}
        src={item.url ?? undefined}
        className={`${fitClass} object-center`}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        playsInline
        muted
        preload="metadata"
      />
    );
  };

  return (
    <div className="mt-4 flex w-full justify-center px-1 md:px-2">
      <div className="mx-auto w-full max-w-2xl">
        {mediaCount === 1 ? (
          <button
            type="button"
            aria-label={aria}
            onClick={() => setLightboxIndex(0)}
            className="group relative w-full"
          >
            <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 aspect-[4/5] lg:aspect-video">
              {(() => {
                const item = itemsSource[0];
                const backdropUrl =
                  item.media_type === 'video' ? item.poster_url ?? item.posterUrl ?? null : item.url;
                if (!backdropUrl) return null;
                return (
                  <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
                    <Image
                      src={backdropUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 560px, 100vw"
                      className="object-cover scale-110 blur-2xl opacity-90"
                    />
                    <div className="absolute inset-0 bg-white/20" />
                  </div>
                );
              })()}
              {renderPreview(itemsSource[0], 'h-full w-full object-contain')}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              {itemsSource[0].media_type === 'video' ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition duration-200 group-hover:scale-105">
                    ▶
                  </span>
                </div>
              ) : null}
            </div>
          </button>
        ) : (
          <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 aspect-[4/5] lg:aspect-video">
            <div
              className={`grid h-full w-full gap-[2px] bg-white ${
                mediaCount === 2
                  ? 'grid-cols-2'
                  : mediaCount === 3
                    ? 'grid-cols-[2fr_1fr] grid-rows-2'
                    : 'grid-cols-2 grid-rows-2'
              }`}
            >
              {collageItems.map((item, index) => {
                const isLarge = mediaCount === 3 && index === 0;
                const isLast = index === collageItems.length - 1 && extraCount > 0;
                return (
                  <button
                    key={item.id ?? `${item.url}-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className={`relative h-full w-full overflow-hidden ${isLarge ? 'row-span-2' : ''}`}
                    aria-label={aria}
                  >
                    {renderPreview(item, 'h-full w-full object-cover')}
                    {item.media_type === 'video' ? (
                      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                        VIDEO
                      </span>
                    ) : null}
                    {isLast ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                        +{extraCount}
                      </span>
                    ) : null}
                    {item.media_type === 'video' ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg">
                          ▶
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {lightboxIndex !== null && items.length > 0 ? (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={items.length > 1 ? () => setLightboxIndex((prev) => (prev ? prev - 1 : items.length - 1)) : undefined}
          onNext={items.length > 1 ? () => setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % items.length)) : undefined}
        />
      ) : null}
    </div>
  );
}
