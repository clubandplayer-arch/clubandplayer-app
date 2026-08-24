'use client';

import { useRouter } from 'next/navigation';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import useIsClub from '@/hooks/useIsClub';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function NewOpportunityPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isClub, loading } = useIsClub();

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">{t('opportunity.checkingPermissions')}</div>;
  }

  if (!isClub) {
    return (
      <div className="page-shell max-w-2xl rounded-xl border bg-yellow-50 p-4 text-yellow-900">
        {t('opportunities.clubOnly')}
        <div className="mt-2">
          <a href="/player/profile" className="underline">{t('opportunity.openProfile')}</a> e imposta il tipo account su <b>Club</b>.
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">{t('opportunity.new')}</h1>
      <OpportunityForm
        onCancel={() => router.push('/opportunities')}
        onSaved={() => router.push('/opportunities')}
      />
    </div>
  );
}
