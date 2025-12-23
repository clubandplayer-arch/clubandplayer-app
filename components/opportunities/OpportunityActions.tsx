'use client';

import Link from 'next/link';
import ApplyCTA from '@/components/opportunities/ApplyCTA';

type Props = {
  opportunityId: string;
  clubProfileId?: string | null;
  showApply?: boolean;
  hideClubLink?: boolean;
};

export default function OpportunityActions({ opportunityId, clubProfileId, showApply = true, hideClubLink = false }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {showApply && <ApplyCTA oppId={opportunityId} />}

      {clubProfileId && !hideClubLink && (
        <Link
          href={`/clubs/${clubProfileId}`}
          className="rounded-xl border px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Visita club
        </Link>
      )}
    </div>
  );
}
