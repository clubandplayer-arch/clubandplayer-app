// hooks/useInfiniteScroll.ts
'use client';

import { useEffect, useRef } from 'react';

type Options = {
  rootMargin?: string;
  threshold?: number;
  disabled?: boolean;
  onIntersect: () => void;
};

export function useInfiniteScroll<T extends HTMLElement>({
  rootMargin = '400px',
  threshold = 0,
  disabled = false,
  onIntersect,
}: Options) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) onIntersect();
        });
      },
      { root: null, rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, disabled, onIntersect]);

  return ref;
}
