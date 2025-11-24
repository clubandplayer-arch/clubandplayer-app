// components/applications/ReceivedApplicationsPage.tsx
'use client';

import { useEffect, useState } from 'react';
import ApplicationsTable from '@/components/applications/ApplicationsTable';

type ApplicationRow = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  athlete_id?: string | null;
  [key: string]: any;
};

export default function ReceivedApplicationsPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const handleStatusChange = (id: string, status: 'accepted' | 'rejected') => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch('/api/applications/received', {
          credentials: 'include',
          cache: 'no-store',
        });

        const text = await res.text();
        if (!res.ok) {
          try {
            const j = JSON.parse(text);
            throw new Error(j.error || `HTTP ${res.status}`);
          } catch {
            throw new Error(text || `HTTP ${res.status}`);
          }
        }

        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        const arr = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        if (!cancelled) {
          setRows(arr as ApplicationRow[]);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'Errore nel caricamento delle candidature');
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Candidature ricevute</h1>
        <p className="text-sm text-gray-600">
          Elenco delle candidature alle opportunità pubblicate dal tuo club.
        </p>
      </header>

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <ApplicationsTable
        rows={rows}
        kind="received"
        loading={loading}
        onStatusChange={handleStatusChange}
      />

      {!loading && !err && rows.length === 0 && (
        <div className="text-sm text-gray-500">Nessuna candidatura ricevuta al momento.</div>
      )}
    </main>
  );
}
