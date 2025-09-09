// app/applications/page.tsx
export const dynamic = 'force-dynamic';

import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { cookies } from 'next/headers';

async function fetchReceived() {
  try {
    const cookieHeader = (await cookies()).toString();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const res = await fetch(`${base}/api/applications/received`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json().catch(() => ({} as any));
    const rows =
      (Array.isArray(data) && data) ||
      (Array.isArray(data.items) && data.items) ||
      (Array.isArray(data.data) && data.data) ||
      [];
    return rows;
  } catch {
    return [];
  }
}

export default async function ReceivedApplicationsPage() {
  const rows = await fetchReceived();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Candidature ricevute</h1>
      <ApplicationsTable rows={rows} kind="received" />
    </div>
  );
}

