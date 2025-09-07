'use client';

import { useEffect, useState } from 'react';

type MyApplication = {
  id: string;
  opportunity_id: string;
  athlete_id: string;
  note: string | null;
  status: 'submitted' | 'seen' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};

export default function MyApplicationsPage() {
  const [apps, setApps] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setApps(j.data || []);
    } catch (e: any) {
      setErr(e.message || 'Errore');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function withdraw(id: string) {
    if (!confirm('Ritirare la candidatura?')) return;
    const r = await fetch(`/api/applications/${id}`, { method: 'DELETE', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error || `HTTP ${r.status}`); return; }
    setApps(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Le mie candidature</h1>
        <button onClick={load} className="px-3 py-1 rounded border">Ricarica</button>
      </div>

      {loading && <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />}
      {err && <div className="border rounded-xl p-3 bg-red-50 text-red-700">{err}</div>}
      {!loading && !err && !apps.length && <div className="text-sm text-gray-600">Non hai ancora candidature.</div>}

      {!loading && !err && !!apps.length && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left border-b">
                <th className="py-2 px-3">Candidatura</th>
                <th className="py-2 px-3">Stato</th>
                <th className="py-2 px-3">Nota</th>
                <th className="py-2 px-3">Creata</th>
                <th className="py-2 px-3">Azione</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="py-2 px-3">
                    <div className="font-medium">{a.opportunity_id}</div>
                    <div className="text-xs text-gray-500">id opportunità</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block rounded px-2 py-0.5 bg-gray-100">{a.status}</span>
                  </td>
                  <td className="py-2 px-3">{a.note || '—'}</td>
                  <td className="py-2 px-3">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => withdraw(a.id)} className="px-2 py-1 rounded border hover:bg-gray-50">
                      Ritira
                    </button>
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
