// app/applications/sent/page.tsx
export const dynamic = 'force-dynamic';

import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { cookies, headers as nextHeaders } from 'next/headers';

function getOriginFromHeaders(h: Headers) {
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  return `${proto}://${host}`;
}

async function cookieHeader(): Promise<string> {
  const ck = await cookies();
  return ck.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
}

async function fetchSentRows() {
  try {
    const h = await nextHeaders();
    const origin = getOriginFromHeaders(h);
    const base = process.env.NEXT_PUBLIC_BASE_URL || origin;

    // Usa l'endpoint corretto: /api/applications (mine)
    const res = await fetch(`${base}/api/applications`, {
      cache: 'no-store',
      headers: { cookie: await cookieHeader() },
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => ({} as any));
    return (
      (Array.isArray(data) && data) ||
      (Array.isArray(data.items) && data.items) ||
      (Array.isArray(data.data) && data.data) ||
      []
    );
  } catch {
    return [];
  }
}

export default async function SentApplicationsPage() {
  const rows = await fetchSentRows();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">
        Candidature inviate
      </h1>
      <ApplicationsTable rows={rows} kind="sent" />
    </div>
  );
}
