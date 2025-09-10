// app/applications/page.tsx
export const dynamic = 'force-dynamic';

import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { cookies } from 'next/headers';

async function getRole(): Promise<'athlete' | 'club' | null> {
  try {
    const cookieHeader = (await cookies()).toString();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const r = await fetch(`${base}/api/profiles/me`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({} as any));
    const t =
      (j?.data?.profile_type ?? j?.data?.type ?? j?.type ?? j?.profile?.type ?? '')
        .toString()
        .toLowerCase();
    if (t.includes('atlet')) return 'athlete';
    if (t.includes('club')) return 'club';
    return null;
  } catch {
    return null;
  }
}

async function fetchReceived() {
  try {
    const cookieHeader = (await cookies()).toString();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const res = await fetch(`${base}/api/applications/received`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) return [];
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
  const [role, rows] = await Promise.all([getRole(), fetchReceived()]);

  if (role === 'athlete') {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-3 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded">
          Stai visualizzando come <b>Atleta</b>. Le candidature ricevute sono visibili quando sei un <b>Club</b>.
        </div>
        <ApplicationsTable rows={[]} kind="received" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Candidature ricevute</h1>
      <p className="text-sm text-gray-600 mb-4">Sei loggato come <b>{role ?? 'ospite'}</b>.</p>
      <ApplicationsTable rows={rows} kind="received" />
    </div>
  );
}
