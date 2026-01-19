'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAdsEnabled } from '@/lib/env/features';
import { useAdsServeCoordinator, type DedupeMode } from '@/components/ads/AdsServeCoordinator';
import { normalizeExternalUrl } from '@/lib/utils/normalizeExternalUrl';

const ADS_ENDPOINT = '/api/ads/serve';
const ADS_CLICK_ENDPOINT = '/api/ads/click';

type AdCreative = {
  id: string;
  campaignId: string;
  slot: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  targetUrl: string;
};

type AdSlotProps = {
  slot: string;
  page: string;
  imageAspect?: 'landscape' | 'portrait' | 'portraitShort';
  dedupeMode?: DedupeMode;
};

const pageCampaignIds = new Map<string, Set<string>>();

const getExcludeCampaignIds = (page: string) => {
  return Array.from(pageCampaignIds.get(page) ?? []);
};

const rememberCampaignId = (page: string, campaignId: string) => {
  const existing = pageCampaignIds.get(page) ?? new Set<string>();
  existing.add(campaignId);
  pageCampaignIds.set(page, existing);
};

const inferDedupeMode = (slot: string) => {
  if (slot === 'feed_infeed') return 'infeed';
  if (slot.startsWith('left_') || slot.startsWith('sidebar_')) return 'page';
  return 'none';
};

export default function AdSlot({ slot, page, imageAspect = 'landscape', dedupeMode }: AdSlotProps) {
  const adsEnabled = isAdsEnabled();
  const [creative, setCreative] = useState<AdCreative | null>(null);
  const coordinator = useAdsServeCoordinator();
  const effectiveDedupeMode = useMemo(() => dedupeMode ?? inferDedupeMode(slot), [dedupeMode, slot]);
  const imageAspectClass =
    imageAspect === 'portrait' ? 'aspect-[9/16]' : imageAspect === 'portraitShort' ? 'aspect-[4/5]' : 'aspect-video';
  const computedSizes =
    slot === 'feed_infeed'
      ? '(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 560px, 100vw'
      : slot.startsWith('left_') || slot.startsWith('sidebar_')
        ? '(min-width: 1280px) 260px, (min-width: 1024px) 246px, (min-width: 768px) 240px, 100vw'
        : '(max-width: 1024px) 100vw, 320px';

  useEffect(() => {
    if (!adsEnabled) return;
    let cancelled = false;

    (async () => {
      try {
        if (coordinator) {
          const nextCreative = await coordinator.serveAd({ slot, page, dedupeMode: effectiveDedupeMode });
          if (!cancelled) setCreative(nextCreative);
          return;
        }

        const excludeCampaignIds = getExcludeCampaignIds(page);
        const res = await fetch(ADS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot, page, exclude_campaign_ids: excludeCampaignIds }),
        });

        if (!res.ok) {
          if (!cancelled) setCreative(null);
          return;
        }

        const payload = await res.json().catch(() => null);
        if (cancelled) return;
        const nextCreative = payload?.creative ?? null;
        if (nextCreative?.campaignId) {
          rememberCampaignId(page, nextCreative.campaignId);
        }
        setCreative(nextCreative);
      } catch {
        if (!cancelled) setCreative(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adsEnabled, coordinator, effectiveDedupeMode, page, slot]);

  const handleClick = useCallback(() => {
    if (!creative) return;
    const payload = {
      creativeId: creative.id,
      campaignId: creative.campaignId,
      slot: creative.slot,
      page,
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ADS_CLICK_ENDPOINT, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      return;
    }

    fetch(ADS_CLICK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => null);
  }, [creative, page]);

  if (!adsEnabled || !creative) return null;

  const href = normalizeExternalUrl(creative.targetUrl);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sponsored</div>
        {href ? (
          <a
            href={href}
            onClick={handleClick}
            className="mt-2 flex flex-col gap-3 text-left"
            rel="sponsored noopener noreferrer"
            target="_blank"
          >
            {creative.imageUrl ? (
              <div
                className={`relative w-full ${imageAspectClass} overflow-hidden rounded-xl border border-slate-100 bg-slate-50`}
                data-ad-slot={slot}
                data-ad-aspect={imageAspect ?? 'landscape'}
              >
                <Image
                  src={creative.imageUrl}
                  alt=""
                  fill
                  sizes={computedSizes}
                  quality={90}
                  className="object-cover"
                />
              </div>
            ) : null}
            <div>
              {creative.title ? (
                <p className="text-sm font-semibold text-slate-900 line-clamp-2">{creative.title}</p>
              ) : null}
              {creative.body ? (
                <p className="mt-1 text-xs text-slate-500 line-clamp-3">{creative.body}</p>
              ) : null}
            </div>
          </a>
        ) : (
          <div className="mt-2 flex cursor-not-allowed flex-col gap-3 text-left">
            {creative.imageUrl ? (
              <div
                className={`relative w-full ${imageAspectClass} overflow-hidden rounded-xl border border-slate-100 bg-slate-50`}
                data-ad-slot={slot}
                data-ad-aspect={imageAspect ?? 'landscape'}
              >
                <Image
                  src={creative.imageUrl}
                  alt=""
                  fill
                  sizes={computedSizes}
                  quality={90}
                  className="object-cover"
                />
              </div>
            ) : null}
            <div>
              {creative.title ? (
                <p className="text-sm font-semibold text-slate-900 line-clamp-2">{creative.title}</p>
              ) : null}
              {creative.body ? (
                <p className="mt-1 text-xs text-slate-500 line-clamp-3">{creative.body}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
