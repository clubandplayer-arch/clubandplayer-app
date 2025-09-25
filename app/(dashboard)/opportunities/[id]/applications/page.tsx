'use client';

import { useEffect, useState } from 'react';

type Application = {
  id: string;
  athlete_id: string;
  note: string | null;
  status: 'submitted' | 'seen' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  athlete?: { id: string; display_name?: string | null; profile_type?: string | null } | null;
};

function StatusBadge({ s }: { s: Application['status'] }) {
  const style =
    s === 'accepted'
      ? 'bg-green-100 text-green-700'
      : s === 'rejected'
        ? 'bg-red-100 text-red-700'
        : s === 'seen'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${style}`}>{s}</span>;
}

export default function OpportunityApplicationsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/opportunities/${id}/applications`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (!cancelled) setApps(j.data || []);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Errore');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function setStatus(appId: string, status: Application['status']) {
    const r = await fetch(`/api/applications/${appId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j.error || `HTTP ${r.status}`);
      return;
    }
    setApps((prev) => prev.map((a) => (a.id === appId ? j.data : a)));
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Candidature</h1>
      {loading && <div className="h-24 animate-pulse rounded-xl bg-gray-200" />}
      {err && <div className="rounded-xl border bg-red-50 p-3 text-red-700">{err}</div>}
      {!loading && !err && !apps.length && (
        <div className="text-sm text-gray-600">Nessuna candidatura.</div>
      )}

      {!loading && !err && !!apps.length && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b text-left">
                <th className="px-3 py-2">Atleta</th>
                <th className="px-3 py-2">Nota</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Azione</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.athlete?.display_name || a.athlete_id}</div>
                    <div className="text-xs text-gray-500">
                      {a.athlete?.profile_type || 'Atleta'}
                    </div>
                  </td>
                  <td className="px-3 py-2">{a.note || '—'}</td>
                  <td className="px-3 py-2">
                    <StatusBadge s={a.status} />
                  </td>
                  <td className="px-3 py-2">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border px-2 py-1"
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value as Application['status'])}
                    >
                      <option value="submitted">submitted</option>
                      <option value="seen">seen</option>
                      <option value="accepted">accepted</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
