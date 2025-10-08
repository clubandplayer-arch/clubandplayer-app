'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export default function TrackOpportunityOpen({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;
    track('opportunity_open', { opportunity_id: id });
  }, [id]);

  return null;
}
