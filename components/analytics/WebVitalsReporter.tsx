'use client';

import { useEffect } from 'react';
import { captureSafe } from '@/lib/analytics';

function emit(metric: {
  name: string;
  value: number;
  id?: string;
  rating?: string;
  delta?: number;
}) {
  const nav = (performance?.getEntriesByType('navigation') ?? []) as PerformanceNavigationTiming[];
  captureSafe(`web_vital_${metric.name.toLowerCase()}`, {
    value: Number(metric.value.toFixed(2)),
    delta: metric.delta != null ? Number(metric.delta.toFixed(2)) : undefined,
    rating: metric.rating,
    id: metric.id,
    nav: nav?.[0]?.type,
    conn: typeof navigator !== 'undefined' ? (navigator as any).connection?.effectiveType : undefined,
  });
}

export default function WebVitalsReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    let cancelled = false;

    import('next/dist/compiled/web-vitals')
      .then(({ onCLS, onFID, onINP, onLCP, onTTFB }) => {
        if (cancelled) return;
        onCLS(emit);
        onFID(emit);
        onINP(emit);
        onLCP(emit);
        onTTFB(emit);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
