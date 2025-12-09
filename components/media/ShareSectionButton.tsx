'use client';

import { useMemo, useState } from 'react';
import { shareOrCopyLink } from '@/lib/share';

type MediaTab = 'video' | 'photo';

type ShareSectionButtonProps = {
  activeTab: MediaTab;
};

export function ShareSectionButton({ activeTab }: ShareSectionButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';

    const url = new URL('/mymedia', window.location.origin);
    const suffix = activeTab === 'photo' ? 'photo' : 'video';
    url.searchParams.set('type', suffix);
    url.hash = suffix === 'photo' ? 'my-photos' : 'my-videos';

    return url.toString();
  }, [activeTab]);

  async function handleClick() {
    if (!shareUrl) return;
    try {
      const result = await shareOrCopyLink({
        url: shareUrl,
        copiedMessage: 'Link della sezione copiato negli appunti',
      });

      if (result === 'shared' || result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('[mymedia] clipboard error', error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full border border-cp-brand/50 px-3 py-1.5 text-xs font-semibold text-cp-brand transition hover:-translate-y-[1px] hover:bg-cp-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-brand/70 focus-visible:ring-offset-2"
    >
      {copied
        ? 'Link copiato!'
        : activeTab === 'photo'
          ? 'Condividi queste foto'
          : 'Condividi questi video'}
    </button>
  );
}
