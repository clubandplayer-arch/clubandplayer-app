// components/applications/ApplicationsDashboard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

import ApplicationsTable from '@/components/applications/ApplicationsTable';

type Role = 'club' | 'athlete' | 'guest';

type ApplicationRow = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  opportunity?: { id?: string | null; title?: string | null; location?: string | null } | null;
  counterparty?: Record<string, any> | null;
  [key: string]: any;
};

function normalizeRole(v: unknown): Role {
  const raw = (typeof v === 'string' ? v : '').toLowerCase();
  if (raw.includes('club')) return 'club';
  if (raw.includes('athlete') || raw.includes('player')) return 'athlete';
  return 'guest';
}

export default function ApplicationsDashboard() {
  const [role, setRole] = useState<Role>('guest');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rowsReceived, setRowsReceived] = useState<ApplicationRow[]>([]);
  const [rowsSent, setRowsSent] = useState<ApplicationRow[]>([]);
  const [filterOpp, setFilterOpp] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/applications', { credentials: 'include', cache: 'no-store' });
        const text = await res.text();
        if (res.status === 401) {
          if (!cancelled) {
            setRole('guest');
            setRowsReceived([]);
            setRowsSent([]);
          }
          return;
        }
        if (!res.ok) throw new Error(text || 'Errore');

        const json = JSON.parse(text || '{}');
        const data = Array.isArray(json?.data) ? (json.data as ApplicationRow[]) : [];
        const apiRole: Role = normalizeRole(json?.role);

        if (!cancelled) {
          setRole(apiRole);
          if (apiRole === 'club') setRowsReceived(data);
          else if (apiRole === 'athlete') setRowsSent(data);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Errore nel caricamento delle candidature');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReceived = useMemo(() => {
    return rowsReceived.filter((row) => {
      const okOpp = filterOpp ? row.opportunity_id === filterOpp : true;
      const okStatus = filterStatus ? (row.status ?? '').toLowerCase() === filterStatus : true;
      return okOpp && okStatus;
    });
  }, [rowsReceived, filterOpp, filterStatus]);

  const filteredSent = useMemo(() => {
    return rowsSent.filter((row) => {
      const okStatus = filterStatus ? (row.status ?? '').toLowerCase() === filterStatus : true;
      const okOpp = filterOpp ? row.opportunity_id === filterOpp : true;
      return okOpp && okStatus;
    });
  }, [rowsSent, filterOpp, filterStatus]);

  const opportunityOptions = useMemo(() => {
    const set = new Map<string, string>();
    const rows = role === 'club' ? rowsReceived : rowsSent;
    rows.forEach((r) => {
      const id = r.opportunity_id || '';
      if (!id) return;
      const title = (r as any).opportunity?.title ?? (r as any).opportunity_title ?? '';
      set.set(id, title || id);
    });
    return Array.from(set.entries());
  }, [rowsReceived, rowsSent, role]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    const rows = role === 'club' ? rowsReceived : rowsSent;
    rows.forEach((r) => {
      const s = (r.status || '').toLowerCase();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [rowsReceived, rowsSent, role]);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="heading-h1">Candidature</h1>
        <p className="text-sm text-gray-600">
          {role === 'club'
            ? 'Gestisci le candidature ricevute sulle opportunità pubblicate dal tuo club.'
            : role === 'athlete'
            ? 'Rivedi le opportunità a cui ti sei candidato e lo stato di ogni domanda.'
            : 'Accedi per vedere le candidature inviate o ricevute.'}
        </p>
      </header>

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      )}

      {role !== 'guest' && (
        <div className="flex flex-col gap-3 rounded-xl border bg-white/80 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={filterOpp}
            onChange={(e) => setFilterOpp(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 sm:w-64"
          >
            <option value="">Tutte le opportunità</option>
            {opportunityOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title || id}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 sm:w-56"
          >
            <option value="">Tutti gli stati</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="text-xs text-gray-600 sm:ml-auto sm:text-right">
            {role === 'club' ? 'Vista Club · candidature ricevute' : 'Vista Player · candidature inviate'}
          </div>
        </div>
      )}

      {role === 'club' && (
        <ApplicationsTable
          rows={filteredReceived}
          kind="received"
          loading={loading}
          onStatusChange={(id, status) =>
            setRowsReceived((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
          }
        />
      )}

      {role === 'athlete' && (
        <ApplicationsTable rows={filteredSent} kind="sent" loading={loading} />
      )}

      {role === 'guest' && (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">
          Effettua l’accesso per visualizzare le candidature inviate o ricevute.
        </div>
      )}
    </main>
  );
}
