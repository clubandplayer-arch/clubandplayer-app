'use client';

import { useMemo, useState } from 'react';
import { Lightbox, type LightboxItem } from '@/components/media/Lightbox';
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';

type Props = {
  postId: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  aspect?: '16:9' | '9:16' | null;
  alt?: string | null;
};

function frameAspect(mediaType?: 'image' | 'video' | null, aspect?: '16:9' | '9:16' | null) {
  if (aspect === '9:16') return 'aspect-[9/16]';
  if (aspect === '16:9') return 'aspect-video';
  if (mediaType === 'video') return 'aspect-video md:aspect-[4/3]';
  return 'aspect-[4/5] md:aspect-[4/3]';
}

export function PostMedia({ postId, mediaUrl, mediaType, aspect, alt }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const aria = alt || (mediaType === 'video' ? "Guarda il video" : "Apri il media");
  const { videoRef, handleEnded, handlePause, handlePlay } = useExclusiveVideoPlayback(postId);

  const items = useMemo<LightboxItem[]>(() => {
    if (!mediaUrl || !mediaType) return [];
    return [
      {
        url: mediaUrl,
        type: mediaType === 'video' ? 'video' : 'image',
        alt: alt || undefined,
      },
    ];
  }, [alt, mediaType, mediaUrl]);

  if (!mediaUrl || !mediaType) return null;

  const aspectClass = frameAspect(mediaType, aspect);

  return (
    <div className="mt-3 flex w-full justify-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-neutral-100 shadow-inner">
        <div className={`relative ${aspectClass} flex items-center justify-center bg-black/5`}>
          {mediaType === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={mediaUrl ?? undefined}
                controls
                className="h-full w-full object-contain bg-black"
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                playsInline
              />
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-lg transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Apri in grande
              </button>
            </>
          ) : (
            <button type="button" className="h-full w-full" onClick={() => setLightboxIndex(0)}>
              <span className="sr-only">{aria}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl} alt={aria} className="h-full w-full object-contain" loading="lazy" />
            </button>
          )}
        </div>
      </div>

      {lightboxIndex !== null && items.length > 0 ? (
        <Lightbox items={items} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </div>
  );
}
