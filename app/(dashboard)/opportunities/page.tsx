'use client';

import { Suspense } from 'react';
import OpportunitiesClient from './OpportunitiesClient';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function OpportunitiesPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="p-6">{t('common.loading')}</div>}>
      <OpportunitiesClient />
    </Suspense>
  );
}
