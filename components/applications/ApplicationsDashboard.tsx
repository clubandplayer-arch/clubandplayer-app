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
  opportunity?: OpportunitySummary | null;
  athlete_id?: string | null;
  [key: string]: any;
};

type OpportunitySummary = {
  id: string;
  title?: string | null;
  club_name?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;
};

async function fetchOpportunityMap(ids: string[]): Promise<Map<string, OpportunitySummary>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, OpportunitySummary>();
  if (!unique.length) return map;

  await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await fetch(`/api/opportunities/${id}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const data = (json as any)?.data ?? null;
        if (data) map.set(id, data as OpportunitySummary);
      } catch {
        /* ignore */
      }
    })
  );

  return map;
}

async function detectRole(): Promise<Role> {
  try {
    const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
    const json = await res.json().catch(() => ({} as any));
    const raw = (json?.role ?? '').toString().toLowerCase();
    if (raw.includes('club')) return 'club';
    if (raw.includes('athlete') || raw.includes('player')) return 'athlete';

    const profRes = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
    const prof = await profRes.json().catch(() => ({} as any));
    const t = (prof?.data?.type ?? prof?.data?.profile_type ?? '').toString().toLowerCase();
    if (t.startsWith('club')) return 'club';
    if (t.includes('athlete')) return 'athlete';
  } catch {
    /* ignore */
  }

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
    detectRole().then(setRole);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        if (role === 'club') {
          const res = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
          const text = await res.text();
          if (!res.ok) throw new Error(text || 'Errore');
          const json = JSON.parse(text || '{}');
          if (!cancelled) setRowsReceived(Array.isArray(json?.data) ? json.data : []);
        } else if (role === 'athlete') {
          const res = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
          const text = await res.text();
          if (!res.ok) throw new Error(text || 'Errore');
          const json = JSON.parse(text || '{}');
          const rows = (Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []) as ApplicationRow[];

          const oppMap = await fetchOpportunityMap(rows.map((r) => r.opportunity_id || ''));
          const enhanced = rows.map((r) => ({
            ...r,
            opportunity: r.opportunity || oppMap.get(r.opportunity_id || '') || null,
          }));

          if (!cancelled) setRowsSent(enhanced);
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
  }, [role]);

  useEffect(() => {
    if (role !== 'club') return;
    const needsEnrichment = rowsReceived.some((r) => r.athlete_id && !r.athlete);
    if (!needsEnrichment) return;
    const ids = Array.from(
      new Set(rowsReceived.map((r) => r.athlete_id).filter(Boolean) as string[]),
    );
    if (!ids.length) return;

    const controller = new AbortController();
    (async () => {
      try {
        const qs = encodeURIComponent(ids.join(','));
        const res = await fetch(`/api/profiles/public?ids=${qs}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({ data: [] }));
        const map: Record<string, any> = {};
        const list = Array.isArray(json?.data) ? json.data : [];
        list.forEach((row: any) => {
          const key = row.id || row.user_id;
          if (!key) return;
          map[String(key)] = {
            ...row,
            id: row.user_id || row.id,
            name: row.display_name || row.full_name || row.headline || null,
          };
        });
        setRowsReceived((prev) =>
          prev.map((r) => {
            const enriched = map[r.athlete_id ?? ''];
            return enriched ? { ...r, athlete: enriched } : r;
          }),
        );
      } catch (fetchErr) {
        if (!(fetchErr as any)?.name?.includes('AbortError')) {
          // ignora
        }
      }
    })();

    return () => controller.abort();
  }, [role, rowsReceived]);

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
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white/80 p-3">
          <select
            value={filterOpp}
            onChange={(e) => setFilterOpp(e.target.value)}
            className="rounded-lg border px-3 py-2"
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
            className="rounded-lg border px-3 py-2"
          >
            <option value="">Tutti gli stati</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="ml-auto text-xs text-gray-600">
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
