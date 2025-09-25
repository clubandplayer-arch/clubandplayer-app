'use client';

import { useEffect, useState } from 'react';
import ApplicationsTable from '@/components/applications/ApplicationsTable';

type ApplicationRow = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  status?: string | null;
  athlete_id?: string | null;
  [k: string]: any;
};

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // API: usa /api/applications/mine (elenco candidature dell'atleta)
        const r = await fetch('/api/applications/mine', {
          credentials: 'include',
          cache: 'no-store',
        });
        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
        const json = JSON.parse(txt);
        const items = json?.data ?? json ?? [];
        if (!cancelled) setRows(Array.isArray(items) ? items : []);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Errore');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Le mie candidature</h1>
      {err && <div className="rounded-lg border bg-red-50 p-3 text-red-700">Errore: {err}</div>}
      <ApplicationsTable rows={rows} kind="sent" loading={loading} />
    </div>
  );
}
