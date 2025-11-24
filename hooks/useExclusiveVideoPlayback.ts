import { useCallback, useEffect, useRef } from 'react';

const registry = new Map<string, HTMLVideoElement>();
let currentPlayingId: string | null = null;

function pauseAllExcept(id: string) {
  registry.forEach((el, key) => {
    if (key !== id) {
      try {
        el.pause();
      } catch {
        // ignore
      }
    }
  });
}

export function useExclusiveVideoPlayback(videoId: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      registry.set(videoId, el);
    }
    return () => {
      registry.delete(videoId);
      if (currentPlayingId === videoId) {
        currentPlayingId = null;
      }
    };
  }, [videoId]);

  const handlePlay = useCallback(() => {
    pauseAllExcept(videoId);
    currentPlayingId = videoId;
  }, [videoId]);

  const handlePause = useCallback(() => {
    if (currentPlayingId === videoId) {
      currentPlayingId = null;
    }
  }, [videoId]);

  const handleEnded = useCallback(() => {
    if (currentPlayingId === videoId) {
      currentPlayingId = null;
    }
  }, [videoId]);

  return { videoRef, handlePlay, handlePause, handleEnded };
}
