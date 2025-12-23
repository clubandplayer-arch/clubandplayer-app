'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastProvider';

type Athlete = {
  id?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  sport?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
};

type Opportunity = {
  id?: string | null;
  title?: string | null;
  role?: string | null;
};

type ApplicationRow = {
  id: string;
  athlete_id?: string | null;
  athlete?: Athlete | null;
  opportunity_id?: string | null;
  opportunity?: Opportunity | null;
  status?: string | null;
  created_at?: string | null;
};

const statusLabel = (s: string | null | undefined) => {
  const key = (s || '').toLowerCase();
  if (key === 'accepted') return 'Accettata';
  if (key === 'rejected') return 'Rifiutata';
  return 'In attesa';
};

const statusBadgeClass = (s: string | null | undefined) => {
  const key = (s || '').toLowerCase();
  if (key === 'accepted') return 'bg-green-100 text-green-800';
  if (key === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

export default function ClubApplicationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [roleChecked, setRoleChecked] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => ({} as any));
        const rawRole = (j?.role || '').toString().toLowerCase();
        if (rawRole !== 'club') {
          router.replace('/feed');
          return;
        }
        if (!cancelled) setRoleChecked(true);
      } catch {
        router.replace('/feed');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const load = async (params?: { status?: string; opportunity?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      const status = params?.status ?? statusFilter;
      if (status) qs.set('status', status);
      const opp = params?.opportunity ?? opportunityFilter;
      if (opp) qs.set('opportunity_id', opp);
      const res = await fetch(`/api/applications/received?${qs.toString()}`, {
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
  };

  useEffect(() => {
    if (!roleChecked) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleChecked, statusFilter, opportunityFilter]);

  const uniqueOpportunities = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const id = r.opportunity_id || '';
      if (!id) return;
      const title = (r.opportunity?.title || '').trim() || id;
      map.set(id, title);
    });
    return Array.from(map.entries());
  }, [rows]);

  const canAct = (s?: string | null) => {
    const key = (s || '').toLowerCase();
    return key !== 'accepted' && key !== 'rejected';
  };

  const updateStatus = async (id: string, next: 'accepted' | 'rejected') => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      toast.success(next === 'accepted' ? 'Candidatura accettata' : 'Candidatura rifiutata');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Errore durante l’aggiornamento');
    }
  };

  return (
    <main className="page-shell space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Candidature ricevute</h1>
        <p className="text-sm text-gray-600">
          Elenco delle candidature sulle opportunità pubblicate dal tuo club.
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
            <option value="pending">In attesa</option>
            <option value="accepted">Accettate</option>
            <option value="rejected">Rifiutate</option>
            <option value="all">Tutte</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          Opportunità
          <select
            value={opportunityFilter}
            onChange={(e) => setOpportunityFilter(e.target.value)}
            className="min-w-[180px] rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Tutte</option>
            {uniqueOpportunities.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
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
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-white/70 p-6 text-sm text-gray-600">
          Nessuna candidatura trovata per il filtro selezionato.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white/80">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Candidato</th>
                <th className="px-3 py-2">Opportunità</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const athleteId = row.athlete?.id ?? row.athlete_id;
                const name =
                  row.player_name ||
                  row.athlete?.full_name ||
                  row.athlete?.display_name ||
                  row.athlete_id ||
                  'Candidato';
                const headline = [row.athlete?.role, row.athlete?.sport].filter(Boolean).join(' · ');
                const oppTitle = (row.opportunity?.title || '').trim() || row.opportunity_id || 'Annuncio';
                const created = row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : '—';
                const canUpdate = canAct(row.status);

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-gray-900">
                        {athleteId ? (
                          <Link href={`/players/${athleteId}`} className="text-blue-700 hover:underline">
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </div>
                      {headline ? <div className="text-xs text-gray-600">{headline}</div> : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.opportunity_id ? (
                        <Link href={`/opportunities/${row.opportunity_id}`} className="text-blue-700 hover:underline">
                          {oppTitle}
                        </Link>
                      ) : (
                        oppTitle
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">{created}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={!canUpdate}
                          onClick={() => updateStatus(row.id, 'accepted')}
                          className="rounded-md border border-green-200 px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                        >
                          Accetta
                        </button>
                        <button
                          disabled={!canUpdate}
                          onClick={() => updateStatus(row.id, 'rejected')}
                          className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Rifiuta
                        </button>
                      </div>
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
