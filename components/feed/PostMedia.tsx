'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Lightbox, type LightboxItem } from '@/components/media/Lightbox';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';

type Props = {
  postId: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  alt?: string | null;
};

export function PostMedia({ postId, mediaUrl, mediaType, alt }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const aria = alt || (mediaType === 'video' ? "Guarda il video" : "Apri il media");
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(postId);

  const items = useMemo<LightboxItem[]>(() => {
    if (!mediaUrl || !mediaType) return [];
    return [
      {
        url: mediaUrl,
        type: mediaType,
        alt: alt || undefined,
      },
    ];
  }, [alt, mediaType, mediaUrl]);

  if (!mediaUrl || !mediaType) return null;

  return (
    <div className="mt-4 flex w-full justify-center px-1 md:px-2">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          aria-label={aria}
          onClick={() => setLightboxIndex(0)}
          className="group relative w-full"
        >
          <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 aspect-video">
            {mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={mediaUrl ?? undefined}
                className="h-full w-full object-contain object-center"
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                playsInline
                muted
                preload="metadata"
              />
            ) : (
              <Image
                src={mediaUrl}
                alt={aria}
                fill
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 560px, 100vw"
                className="object-contain object-center"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            {mediaType === 'video' ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition duration-200 group-hover:scale-105">
                  ▶
                </span>
              </div>
            ) : null}
          </div>
        </button>
      </div>

      {lightboxIndex !== null && items.length > 0 ? (
        <Lightbox items={items} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </div>
  );
}
