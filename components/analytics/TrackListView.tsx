'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

type Filters = {
  q?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  sport?: string | null;
  role?: string | null;
  age?: string | null; // es. "17-20"
};

export default function TrackListView({
  filters,
  count,
}: {
  filters: Filters;
  count?: number;
}) {
  useEffect(() => {
    track('opportunities_list_view', { ...filters, count });
  }, [JSON.stringify(filters), count]);

  return null;
}
