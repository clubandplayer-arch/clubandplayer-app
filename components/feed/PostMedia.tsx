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
    if (!mediaUrl || !mediaType || mediaType === 'video') return [];
    return [
      {
        url: mediaUrl,
        type: 'image',
        alt: alt || undefined,
      },
    ];
  }, [alt, mediaType, mediaUrl]);

  if (!mediaUrl || !mediaType) return null;

  const aspectClass = frameAspect(mediaType, aspect);

  const containerClasses = [
    'relative flex items-center justify-center bg-black/5',
    aspectClass,
    mediaType === 'video' ? 'max-h-[420px]' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mt-3 flex w-full justify-center px-1">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-neutral-100 shadow-inner">
        <div className={containerClasses}>
          {mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={mediaUrl ?? undefined}
              controls
              className="h-full w-full max-h-[420px] object-contain bg-black"
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              playsInline
            />
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
