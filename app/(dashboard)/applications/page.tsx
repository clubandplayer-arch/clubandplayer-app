'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Opportunity = {
  id?: string | null;
  title?: string | null;
  club_id?: string | null;
  club_name?: string | null;
};

type ApplicationRow = {
  id: string;
  opportunity_id?: string | null;
  opportunity?: Opportunity | null;
  status?: string | null;
  created_at?: string | null;
};

const statusLabel = (s: string | null | undefined) => {
  const key = (s || '').toLowerCase();
  if (key === 'accepted') return 'Accettata';
  if (key === 'rejected') return 'Rifiutata';
  return 'In valutazione';
};

const statusBadgeClass = (s: string | null | undefined) => {
  const key = (s || '').toLowerCase();
  if (key === 'accepted') return 'bg-green-100 text-green-800';
  if (key === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => ({} as any));
        const rawRole = (j?.role || '').toString().toLowerCase();
        if (rawRole === 'club') {
          router.replace('/club/applications');
          return;
        }
        if (!j?.user?.id) {
          router.replace('/login');
          return;
        }
        if (!cancelled) setRoleChecked(true);
      } catch {
        router.replace('/login');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      const res = await fetch(`/api/applications/me?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = JSON.parse(text || '{}');
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (err: any) {
      setError(err?.message || 'Errore nel caricamento delle candidature');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!roleChecked) return;
    load();
  }, [load, roleChecked]);

  const rowsSorted = useMemo(
    () => [...rows].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [rows],
  );

  return (
    <main className="page-shell space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Le mie candidature</h1>
        <p className="text-sm text-gray-600">
          Controlla lo stato delle opportunità a cui hai inviato una candidatura.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border bg-white/80 p-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Stato
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="pending">In valutazione</option>
            <option value="accepted">Accettate</option>
            <option value="rejected">Rifiutate</option>
            <option value="all">Tutte</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border bg-white/70 p-6 text-sm text-gray-600">Caricamento candidature…</div>
      ) : rowsSorted.length === 0 ? (
        <div className="rounded-lg border bg-white/70 p-6 text-sm text-gray-600">
          Non hai candidature per il filtro selezionato.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white/80">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Opportunità</th>
                <th className="px-3 py-2">Club</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Azione</th>
              </tr>
            </thead>
            <tbody>
              {rowsSorted.map((row) => {
                const oppTitle = (row.opportunity?.title || '').trim() || 'Annuncio';
                const clubName = row.opportunity?.club_name || 'Club';
                const created = row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : '—';

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-3 align-top">
                      {row.opportunity_id ? (
                        <Link href={`/opportunities/${row.opportunity_id}`} className="text-blue-700 hover:underline">
                          {oppTitle}
                        </Link>
                      ) : (
                        oppTitle
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-800">{clubName}</td>
                    <td className="px-3 py-3 align-top">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">{created}</td>
                    <td className="px-3 py-3 align-top">
                      {row.opportunity_id ? (
                        <Link
                          href={`/opportunities/${row.opportunity_id}`}
                          className="rounded-md border px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                        >
                          Dettagli annuncio
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
