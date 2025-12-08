'use client';

import { useMemo, useState } from 'react';

type MediaTab = 'video' | 'photo';

type ShareSectionButtonProps = {
  activeTab: MediaTab;
};

export function ShareSectionButton({ activeTab }: ShareSectionButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const suffix = activeTab === 'photo' ? 'photo#my-photos' : 'video#my-videos';
    return origin ? `${origin}/mymedia?type=${suffix}` : '';
  }, [activeTab]);

  async function handleClick() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[mymedia] clipboard error', error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-xs font-semibold text-cp-brand underline-offset-2 transition hover:underline"
    >
      {copied ? 'Link copiato!' : 'Condividi sezione'}
    </button>
  );
}
