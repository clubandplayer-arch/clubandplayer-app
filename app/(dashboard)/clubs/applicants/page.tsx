'use client';

import { useEffect, useState } from 'react';
import ApplicationsTable from '@/components/applications/ApplicationsTable';

type Row = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  status?: string | null;
  athlete_id?: string | null;
  [k: string]: any;
};

export default function ClubApplicantsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch('/api/applications/received', {
          credentials: 'include',
          cache: 'no-store',
        });
        const t = await r.text();
        if (!r.ok) throw new Error(t || `HTTP ${r.status}`);

        // Prova a leggere: array diretto oppure { data: [] } / { items: [] }
        let parsed: any = [];
        try { parsed = JSON.parse(t); } catch { parsed = []; }
        const list: Row[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.items)
          ? parsed.items
          : [];

        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Errore nel caricamento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Candidature ricevute</h1>

      {err && (
        <div className="border rounded-lg p-4 bg-red-50 text-red-700">
          {err}
        </div>
      )}

      <ApplicationsTable rows={rows} kind="received" loading={loading} />
    </div>
  );
}
