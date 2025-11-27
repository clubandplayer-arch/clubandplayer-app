/* eslint-disable @next/next/no-img-element */
import { useEffect } from 'react';

export type LightboxItem = {
  url: string;
  type: 'image' | 'video';
  alt?: string;
};

type Props = {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export function Lightbox({ items, index, onClose, onPrev, onNext }: Props) {
  const item = items[index];

  useEffect(() => {
    if (!item) return undefined;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose, onNext, onPrev]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] w-full items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white shadow-lg ring-1 ring-white/30 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Chiudi l'anteprima"
        >
          Chiudi
        </button>

        {onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-lg font-bold text-gray-900 shadow hover:bg-white"
            aria-label="Media precedente"
          >
            ‹
          </button>
        ) : null}

        {item.type === 'video' ? (
          <video
            src={item.url}
            controls
            className="max-h-[90vh] max-w-[90vw] object-contain bg-black"
            playsInline
          />
        ) : (
          <img src={item.url} alt={item.alt ?? 'Media'} className="max-h-[90vh] max-w-[90vw] object-contain" />
        )}

        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-lg font-bold text-gray-900 shadow hover:bg-white"
            aria-label="Media successivo"
          >
            ›
          </button>
        ) : null}
      </div>
    </div>
  );
}

