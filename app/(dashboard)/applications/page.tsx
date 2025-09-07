'use client';

import { useEffect, useState } from 'react';

type Mine = {
  id: string;
  opportunity_id: string;
  note: string | null;
  status: 'submitted' | 'seen' | 'accepted' | 'rejected';
  created_at: string;
};

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const r = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (!stop) setRows(j.data || []);
      } catch (e: any) {
        if (!stop) setErr(e.message || 'Errore');
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Le mie candidature</h1>
      {loading && <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />}
      {err && <div className="border rounded-xl p-3 bg-red-50 text-red-700">{err}</div>}
      {!loading && !err && !rows.length && <div className="text-sm text-gray-600">Ancora nessuna candidatura.</div>}

      {!!rows.length && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left border-b">
                <th className="py-2 px-3">Opportunity</th>
                <th className="py-2 px-3">Nota</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 px-3">{r.opportunity_id}</td>
                  <td className="py-2 px-3">{r.note || '—'}</td>
                  <td className="py-2 px-3">{r.status}</td>
                  <td className="py-2 px-3">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
