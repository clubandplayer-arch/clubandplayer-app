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
      className="text-xs font-semibold text-cp-brand underline-offset-2 transition hover:underline"
    >
      {copied ? 'Link copiato!' : 'Condividi sezione'}
    </button>
  );
}
