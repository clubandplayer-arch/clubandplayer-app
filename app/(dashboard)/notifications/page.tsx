'use client';

import { Suspense } from 'react';
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient';

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Caricamento…</div>}>
      <NotificationsPageClient />
    </Suspense>
  );
}
