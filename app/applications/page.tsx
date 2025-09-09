// app/applications/page.tsx
import ApplicationsTable from '@/components/applications/ApplicationsTable';

async function fetchReceived() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/applications/received`, {
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data.items ?? [];
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
