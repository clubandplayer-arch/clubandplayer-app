'use client';

import Link from 'next/link';
import ApplyCTA from '@/components/opportunities/ApplyCTA';
import { useToast } from '@/components/common/ToastProvider';

type Props = {
  opportunityId: string;
  clubProfileId?: string | null;
  showApply?: boolean;
};

export default function OpportunityActions({ opportunityId, clubProfileId, showApply = true }: Props) {
  const toast = useToast();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showApply && <ApplyCTA oppId={opportunityId} />}

      <button
        type="button"
        onClick={() => toast.info('Salvataggio opportunità in arrivo')}
        className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
      >
        Salva
      </button>

      {clubProfileId && (
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
