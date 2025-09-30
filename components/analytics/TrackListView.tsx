'use client';

import { useEffect } from 'react';
import { captureSafe } from '@/lib/analytics';

type Props = {
  filters?: Record<string, unknown>;
  count?: number;
};

export default function TrackListView({ filters, count }: Props) {
  useEffect(() => {
    captureSafe('opportunities_list_view', {
      filters: filters ?? {},
      count: typeof count === 'number' ? count : undefined,
      ts: Date.now(),
    });
  }, [JSON.stringify(filters), count]);

  return null;
}
