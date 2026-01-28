'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import ShareModal from '@/components/feed/ShareModal';
import { ShareButton } from '@/components/media/ShareButton';
import ApplyCTA from '@/components/opportunities/ApplyCTA';

type Props = {
  opportunityId: string;
  title: string;
  description?: string | null;
  clubProfileId?: string | null;
  showApply?: boolean;
  hideClubLink?: boolean;
};

export default function OpportunityActions({
  opportunityId,
  title,
  description,
  clubProfileId,
  showApply = true,
  hideClubLink = false,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const handleShare = () => {
    if (!shareUrl && typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
    setShareOpen(true);
  };

  return (
    <>
      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap overflow-x-auto">
        {showApply && (
          <div className="shrink-0">
            <ApplyCTA oppId={opportunityId} />
          </div>
        )}

        {clubProfileId && !hideClubLink && (
          <div className="shrink-0">
            <Link
              href={`/clubs/${clubProfileId}`}
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Visita club
            </Link>
          </div>
        )}

        <ShareButton
          onClick={handleShare}
          ariaLabel="Condividi opportunità"
          className="h-10 w-10 shrink-0 rounded-full p-0 text-slate-700 hover:bg-slate-50"
        />
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        text={description}
        url={shareUrl}
      />
    </>
  );
}
