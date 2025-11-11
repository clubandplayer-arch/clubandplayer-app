'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Opportunity = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  data: Opportunity[];
  pagination?: { limit: number; offset: number; count?: number | null };
  error?: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function OpportunitiesClient() {
  const [serverRows, setServerRows] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // controlli UI
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // ruolo utente per abilitare azioni
  const [role, setRole] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      // Ruolo user
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      setRole((data.user?.user_metadata as any)?.role ?? null);

      // Dati
      const url = new URL('/api/opportunities', window.location.origin);
      url.searchParams.set('limit', String(200));
      url.searchParams.set('offset', '0');

      const res = await fetch(url.toString(), { credentials: 'include', signal });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json: ApiResponse = await res.json();
      setServerRows(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setErr(e?.message ?? 'Errore di rete');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    return () => ac.abort();
  }, [fetchData]);

  // filtro + sort client-side
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = serverRows;
    if (q) {
      rows = rows.filter((r) => {
        const t = (r.title ?? '').toLowerCase();
        const d = (r.description ?? '').toLowerCase();
        return t.includes(q) || d.includes(q);
      });
    }
    rows = [...rows].sort((a, b) => {
      const aKey = a.created_at ?? '';
      const bKey = b.created_at ?? '';
      if (aKey && bKey) {
        return sortDir === 'desc' ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
      }
      const ai = String(a.id);
      const bi = String(b.id);
      return sortDir === 'desc' ? bi.localeCompare(ai) : ai.localeCompare(bi);
    });
    return rows;
  }, [serverRows, query, sortDir]);

  // paginazione client-side
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, sortDir]);

  const onDelete = async (id: string | number) => {
    if (role !== 'club') return;
    if (!confirm('Eliminare questa opportunità?')) return;
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      // Refresh lista
      fetchData();
    } catch (e: any) {
      alert(e?.message ?? 'Errore durante l’eliminazione.');
    }
  };

  return (
    <section className="space-y-4">
      {/* Filtri / controlli */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          placeholder="Cerca per titolo o descrizione…"
          className="w-full sm:max-w-md rounded-md border px-3 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ordina</label>
          <select
            className="rounded-md border px-2 py-2 text-sm"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Più recenti</option>
            <option value="asc">Più vecchie</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Per pagina</label>
          <select
            className="rounded-md border px-2 py-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {role === 'club' && (
          <Link
            className="rounded-md bg-black px-3 py-2 text-sm text-white hover:opacity-90"
            href="/opportunities/new"
          >
            + Nuova opportunità
          </Link>
        )}

        <button
          type="button"
          onClick={() => fetchData()}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? 'Aggiorno…' : 'Ricarica'}
        </button>
      </div>

      {/* Stati */}
      {loading && (
        <div className="rounded-md border p-4 text-sm text-gray-600">
          Caricamento opportunità…
        </div>
      )}

      {!loading && err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-md border p-4 text-sm text-gray-600">
          Nessuna opportunità trovata. {role === 'club' ? 'Crea la prima opportunità.' : 'Prova a rimuovere i filtri.'}
        </div>
      )}

      {/* Lista */}
      {!loading && !err && filtered.length > 0 && (
        <>
          <ul className="space-y-2">
            {pageRows.map((o) => (
              <li key={String(o.id)} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{o.title ?? `#${o.id}`}</div>
                    {o.description && (
                      <div className="text-sm text-gray-600 line-clamp-2">{o.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 text-right">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : '—'}
                    </div>
                    {role === 'club' && (
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-red-50"
                        onClick={() => onDelete(o.id)}
                        title="Elimina"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Paginazione */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-sm text-gray-600">
              {filtered.length} risultati totali · Pagina {currentPage}/{pageCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                ← Precedente
              </button>
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
              >
                Successiva →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
