// app/applications/sent/page.tsx
export const dynamic = 'force-dynamic';

import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { cookies } from 'next/headers';

type Role = 'athlete' | 'club' | null;

async function cookieHeader(): Promise<string> {
  const ck = await cookies();
  // Costruisce un header "cookie" valido con TUTTI i cookie
  return ck.getAll().map(c => `${c.name}=${c.value}`).join('; ');
}

async function getRole(): Promise<Role> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const resWho = await fetch(`${base}/api/auth/whoami`, {
      cache: 'no-store',
      headers: { cookie: await cookieHeader() },
    });
    if (!resWho.ok) return null;
    const who = await resWho.json().catch(() => ({} as any));
    if (!who?.id) return null;

    const resProf = await fetch(`${base}/api/profiles/me`, {
      cache: 'no-store',
      headers: { cookie: await cookieHeader() },
    });
    if (!resProf.ok) return null;
    const pj = await resProf.json().catch(() => ({} as any));

    const t = (
      pj?.data?.profile_type ??
      pj?.data?.type ??
      pj?.type ??
      pj?.profile?.type ??
      ''
    ).toString().toLowerCase();

    if (t.includes('club')) return 'club';
    if (t.includes('atlet')) return 'athlete';
    return null;
  } catch {
    return null;
  }
}

async function fetchSentRows() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const res = await fetch(`${base}/api/applications/mine`, {
      cache: 'no-store',
      headers: { cookie: await cookieHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({} as any));
    // accetta array nudo, {items:[]}, {data:[]}
    return (Array.isArray(data) && data) ||
           (Array.isArray(data.items) && data.items) ||
           (Array.isArray(data.data) && data.data) ||
           [];
  } catch {
    return [];
  }
}

export default async function SentApplicationsPage() {
  const [role, rows] = await Promise.all([getRole(), fetchSentRows()]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Candidature inviate</h1>
      <p className="text-sm text-gray-600 mb-4">
        Sei loggato come <b>{role ?? 'non loggato'}</b>.
      </p>
      {role === 'club' ? (
        <div className="mb-3 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded">
          Stai visualizzando come <b>Club</b>. Le candidature inviate sono visibili quando sei un <b>Atleta</b>.
        </div>
      ) : null}
      <ApplicationsTable rows={rows} kind="sent" />
    </div>
  );
}
