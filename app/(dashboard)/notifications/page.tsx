'use client';

import { Suspense } from 'react';
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function NotificationsPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="p-6">{t('notifications.loading')}</div>}>
      <NotificationsPageClient />
    </Suspense>
  );
}
