'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { isAdsEnabled } from '@/lib/env/features';

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
};

export default function AdSlot({ slot, page }: AdSlotProps) {
  const adsEnabled = isAdsEnabled();
  const [creative, setCreative] = useState<AdCreative | null>(null);

  useEffect(() => {
    if (!adsEnabled) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(ADS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot, page }),
        });

        if (!res.ok) {
          if (!cancelled) setCreative(null);
          return;
        }

        const payload = await res.json().catch(() => null);
        if (cancelled) return;
        setCreative(payload?.creative ?? null);
      } catch {
        if (!cancelled) setCreative(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adsEnabled, page, slot]);

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

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sponsored</div>
        <a
          href={creative.targetUrl}
          onClick={handleClick}
          className="mt-2 flex flex-col gap-3 text-left"
          rel="sponsored noopener noreferrer"
          target="_blank"
        >
          {creative.imageUrl ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <Image src={creative.imageUrl} alt="" width={320} height={144} className="h-36 w-full object-cover" />
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
      </div>
    </div>
  );
}
