'use client';

import { useEffect, useState } from 'react';

type Application = {
  id: string;
  opportunity_id?: string;
  applicant_id: string;
  note: string | null;
  status: 'submitted' | 'seen' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};

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
        const r = await fetch(`/api/opportunities/${id}/applications`, { credentials: 'include', cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (!cancelled) setApps(j.data || []);
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
    setApps(prev => prev.map(a => a.id === appId ? j.data : a));
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
                <th className="py-2 px-3">Applicant</th>
                <th className="py-2 px-3">Nota</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Azione</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="py-2 px-3">{a.applicant_id}</td>
                  <td className="py-2 px-3">{a.note || '—'}</td>
                  <td className="py-2 px-3">{a.status}</td>
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
