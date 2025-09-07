'use client';

import { useEffect, useState } from 'react';

type AppRow = {
  id: string;
  opportunity_id: string;
  athlete_id: string;
  note: string | null;
  status: 'submitted'|'seen'|'accepted'|'rejected';
  created_at: string;
  updated_at: string;
  opportunity?: { id: string; title?: string; city?: string|null; province?: string|null; region?: string|null; country?: string|null } | null;
  athlete?: { id: string; display_name?: string|null; profile_type?: string|null } | null;
};

function StatusBadge({ s }: { s: AppRow['status'] }) {
  const style =
    s === 'accepted' ? 'bg-green-100 text-green-700' :
    s === 'rejected' ? 'bg-red-100 text-red-700' :
    s === 'seen'     ? 'bg-blue-100 text-blue-700' :
                       'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${style}`}>{s}</span>;
}

export default function ReceivedApplicationsPage() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRows(j.data || []);
    } catch (e: any) {
      setErr(e.message || 'Errore');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Candidature ricevute</h1>
        <button onClick={load} className="px-3 py-1 rounded border">Ricarica</button>
      </div>

      {loading && <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />}
      {err && <div className="border rounded-xl p-3 bg-red-50 text-red-700">{err}</div>}
      {!loading && !err && !rows.length && <div className="text-sm text-gray-600">Nessuna candidatura.</div>}

      {!!rows.length && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left border-b">
                <th className="py-2 px-3">Annuncio</th>
                <th className="py-2 px-3">Atleta</th>
                <th className="py-2 px-3">Stato</th>
                <th className="py-2 px-3">Nota</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Azione</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => {
                const o = a.opportunity;
                const place = [o?.city, o?.province, o?.region, o?.country].filter(Boolean).join(', ');
                return (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 px-3">
                      <div className="font-medium">{o?.title || a.opportunity_id}</div>
                      <div className="text-xs text-gray-500">{place || '—'}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-medium">{a.athlete?.display_name || a.athlete_id}</div>
                      <div className="text-xs text-gray-500">{a.athlete?.profile_type || 'Atleta'}</div>
                    </td>
                    <td className="py-2 px-3"><StatusBadge s={a.status} /></td>
                    <td className="py-2 px-3">{a.note || '—'}</td>
                    <td className="py-2 px-3">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <a
                        href={`/opportunities/${a.opportunity_id}/applications`}
                        className="px-2 py-1 rounded border hover:bg-gray-50"
                      >
                        Apri
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
