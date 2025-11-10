'use client';

import { useEffect, useState } from 'react';

type Application = {
  id: string;
  athlete_id: string;
  note: string | null;
  status: 'submitted' | 'seen' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  athlete?: { id: string; display_name?: string | null; account_type?: string | null } | null;
};

function StatusBadge({ s }: { s: Application['status'] }) {
  const style =
    s === 'accepted' ? 'bg-green-100 text-green-700' :
    s === 'rejected' ? 'bg-red-100 text-red-700' :
    s === 'seen'     ? 'bg-blue-100 text-blue-700' :
                       'bg-gray-100 text-gray-700';
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
      setLoading(true); setErr(null);
      try {
        const r = await fetch(`/api/opportunities/${id}/applications`, { credentials: 'include', cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (!cancelled) {
          const rows = Array.isArray(j.data) ? j.data : [];
          setApps(
            rows.map((a: any) => ({
              ...a,
              athlete: a.athlete
                ? {
                    ...a.athlete,
                    account_type:
                      (a.athlete.account_type ?? a.athlete.profile_type ?? a.athlete.type ?? null) || null,
                  }
                : null,
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Errore');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function setStatus(appId: string, status: Application['status']) {
    const r = await fetch(`/api/applications/${appId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || `HTTP ${r.status}`); return; }
    const normalized = j.data
      ? {
          ...j.data,
          athlete: j.data.athlete
            ? {
                ...j.data.athlete,
                account_type:
                  (j.data.athlete.account_type ?? j.data.athlete.profile_type ?? j.data.athlete.type ?? null) || null,
              }
            : null,
        }
      : null;
    setApps(prev => prev.map(a => (a.id === appId && normalized ? normalized : a)));
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Candidature</h1>
      {loading && <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />}
      {err && <div className="border rounded-xl p-3 bg-red-50 text-red-700">{err}</div>}
      {!loading && !err && !apps.length && <div className="text-sm text-gray-600">Nessuna candidatura.</div>}

      {!loading && !err && !!apps.length && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left border-b">
                <th className="py-2 px-3">Atleta</th>
                <th className="py-2 px-3">Nota</th>
                <th className="py-2 px-3">Stato</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Azione</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="py-2 px-3">
                    <div className="font-medium">{a.athlete?.display_name || a.athlete_id}</div>
                    <div className="text-xs text-gray-500">{a.athlete?.account_type || 'Atleta'}</div>
                  </td>
                  <td className="py-2 px-3">{a.note || '—'}</td>
                  <td className="py-2 px-3"><StatusBadge s={a.status} /></td>
                  <td className="py-2 px-3">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <select
                      className="border rounded-md px-2 py-1"
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
