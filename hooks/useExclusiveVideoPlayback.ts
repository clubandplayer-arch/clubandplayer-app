import { useCallback, useEffect, useRef } from 'react';

import { emitExclusiveVideoPlay, subscribeExclusiveVideoPlay } from '@/lib/media/exclusivePlayback';

export function useExclusiveVideoPlayback(videoId: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeExclusiveVideoPlay((otherId) => {
      if (otherId === videoId) return;
      const el = videoRef.current;
      if (!el) return;
      try {
        el.pause();
      } catch {
        // ignore
      }
    });

    return unsubscribe;
  }, [videoId]);

  const handlePlay = useCallback(() => {
    emitExclusiveVideoPlay(videoId);
  }, [videoId]);

  const handlePause = useCallback(() => {
    // no-op: kept for API parity
  }, []);

  const handleEnded = useCallback(() => {
    // no-op: kept for API parity
  }, []);

  return { videoRef, handlePlay, handlePause, handleEnded };
}
