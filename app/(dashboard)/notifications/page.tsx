// app/(dashboard)/notifications/page.tsx
'use client';

import ActivityList from '@/components/activity/ActivityList';

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifiche & Attività</h1>
      </div>
      <ActivityList />
    </div>
  );
}