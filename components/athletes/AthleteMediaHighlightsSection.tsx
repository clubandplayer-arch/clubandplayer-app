'use client';

import Image from 'next/image';

import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback';

export type AthleteMediaItem = {
  id: string;
  media_url: string;
  media_type: string | null;
  created_at: string | null;
};

type Props = {
  items: AthleteMediaItem[];
};

function HighlightMediaItem({ item }: { item: AthleteMediaItem }) {
  const { videoRef, handlePlay } = useExclusiveVideoPlayback(`highlight-${item.id}`);

  return (
    <figure className="overflow-hidden rounded-xl border border-neutral-200">
      {item.media_type === 'video' ? (
        <video
          ref={videoRef}
          controls
          className="h-full w-full"
          src={item.media_url}
          onPlay={handlePlay}
          playsInline
        />
      ) : (
        <Image
          src={item.media_url}
          alt="Media dell'atleta"
          width={400}
          height={300}
          className="h-full w-full object-cover"
        />
      )}
      <figcaption className="px-3 py-2 text-xs text-neutral-600">
        Pubblicato il {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
      </figcaption>
    </figure>
  );
}

export default function AthleteMediaHighlightsSection({ items }: Props) {
  const hasMedia = items.length > 0;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="heading-h2 text-xl">Media in evidenza</h2>
      {!hasMedia && <p className="mt-3 text-sm text-neutral-700">Nessun media in evidenza.</p>}
      {hasMedia && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <HighlightMediaItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
