'use client';

import { useEffect, useState } from 'react';

type OpportunityLite = {
  id: string;
  title: string;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  sport?: string | null;
  role?: string | null;
  created_at?: string;
};

type MyApplication = {
  id: string;
  opportunity_id: string;
  athlete_id: string;
  note: string | null;
  status: 'submitted' | 'seen' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  opportunity?: OpportunityLite | null;
};

function StatusBadge({ s }: { s: MyApplication['status'] }) {
  const style =
    s === 'accepted' ? 'bg-green-100 text-green-700' :
    s === 'rejected' ? 'bg-red-100 text-red-700' :
    s === 'seen'     ? 'bg-blue-100 text-blue-700' :
                       'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${style}`}>{s}</span>;
}

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
                <th className="py-2 px-3">Annuncio</th>
                <th className="py-2 px-3">Luogo</th>
                <th className="py-2 px-3">Stato</th>
                <th className="py-2 px-3">Nota</th>
                <th className="py-2 px-3">Candidata il</th>
                <th className="py-2 px-3">Azione</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => {
                const o = a.opportunity;
                const place = [o?.city, o?.province, o?.region, o?.country].filter(Boolean).join(', ');
                return (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 px-3">
                      <div className="font-medium">{o?.title || a.opportunity_id}</div>
                      {o?.sport && <div className="text-xs text-gray-500">{o.sport}{o.role ? ` • ${o.role}` : ''}</div>}
                    </td>
                    <td className="py-2 px-3">{place || '—'}</td>
                    <td className="py-2 px-3"><StatusBadge s={a.status} /></td>
                    <td className="py-2 px-3">{a.note || '—'}</td>
                    <td className="py-2 px-3">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => withdraw(a.id)} className="px-2 py-1 rounded border hover:bg-gray-50">
                        Ritira
                      </button>
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
