'use client';

import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

const ADS_ENDPOINT = '/api/ads/serve';

type AdCreative = {
  id: string;
  campaignId: string;
  slot: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  targetUrl: string;
};

type DedupeMode = 'page' | 'infeed' | 'none';

type ServeAdInput = {
  slot: string;
  page: string;
  dedupeMode?: DedupeMode;
};

type AdsServeCoordinatorValue = {
  serveAd: (input: ServeAdInput) => Promise<AdCreative | null>;
};

const AdsServeCoordinatorContext = createContext<AdsServeCoordinatorValue | null>(null);

const buildExcludeCampaignIds = (
  seenCampaignIds: Set<string>,
  recentInfeedCampaignIds: string[],
  dedupeMode: DedupeMode,
) => {
  if (dedupeMode === 'none') return [];
  const ids = new Set<string>(seenCampaignIds);
  if (dedupeMode === 'infeed') {
    recentInfeedCampaignIds.forEach((id) => ids.add(id));
  }
  return Array.from(ids);
};

export function AdsServeCoordinatorProvider({ children }: { children: React.ReactNode }) {
  const seenCampaignIdsRef = useRef<Set<string>>(new Set());
  const recentInfeedCampaignIdsRef = useRef<string[]>([]);
  const chainRef = useRef<Promise<AdCreative | null>>(Promise.resolve(null));

  const serveAd = useCallback(async ({ slot, page, dedupeMode = 'none' }: ServeAdInput) => {
    const run = async () => {
      const excludeCampaignIds = buildExcludeCampaignIds(
        seenCampaignIdsRef.current,
        recentInfeedCampaignIdsRef.current,
        dedupeMode,
      );
      const requestPayload = {
        slot,
        page,
        exclude_campaign_ids: excludeCampaignIds,
      };

      const res = await fetch(ADS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const payload = res.ok ? await res.json().catch(() => null) : null;
      let nextCreative = payload?.creative ?? null;

      if (!nextCreative && excludeCampaignIds.length > 0) {
        const fallbackRes = await fetch(ADS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot, page }),
        });
        const fallbackPayload = fallbackRes.ok ? await fallbackRes.json().catch(() => null) : null;
        nextCreative = fallbackPayload?.creative ?? null;
      }

      if (nextCreative?.campaignId) {
        seenCampaignIdsRef.current.add(nextCreative.campaignId);
        if (dedupeMode === 'infeed') {
          const queue = recentInfeedCampaignIdsRef.current;
          queue.push(nextCreative.campaignId);
          if (queue.length > 2) {
            queue.splice(0, queue.length - 2);
          }
        }
      }

      return nextCreative;
    };

    const nextPromise = chainRef.current.then(run, run);
    chainRef.current = nextPromise.catch(() => null);
    return nextPromise;
  }, []);

  const value = useMemo(() => ({ serveAd }), [serveAd]);

  return <AdsServeCoordinatorContext.Provider value={value}>{children}</AdsServeCoordinatorContext.Provider>;
}

export const useAdsServeCoordinator = () => useContext(AdsServeCoordinatorContext);

export type { AdCreative, DedupeMode, ServeAdInput };
