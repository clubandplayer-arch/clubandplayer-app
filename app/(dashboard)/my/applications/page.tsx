'use client';

import MyApplications from '@/components/applications/MyApplications';

export default function MyApplicationsPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Le mie candidature</h1>
      <MyApplications />
    </div>
  );
}
