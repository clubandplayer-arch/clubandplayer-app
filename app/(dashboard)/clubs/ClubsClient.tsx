'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchInput from '@/components/controls/SearchInput';
import ClubsTable from '@/components/clubs/ClubsTable';
import Pagination from '@/components/pagination/Pagination';
import type { ClubsApiResponse } from '@/types/club';

export default function ClubsClient() {
  const sp = useSearchParams();

  const [data, setData] = useState<ClubsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Costruisci la query string osservando i parametri nell'URL
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    const q = sp.get('q');
    const page = sp.get('page');
    const pageSize = sp.get('pageSize');
    if (q) p.set('q', q);
    if (page) p.set('page', page);
    if (pageSize) p.set('pageSize', pageSize);
    return p.toString();
  }, [sp]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    fetch(`/api/clubs?${queryString}`, {
      method: 'GET',
      credentials: 'include', // ⇐ include cookie/sessione Supabase
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: ClubsApiResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Errore');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryString, reloadKey]);

  const spForPagination = useMemo(() => {
    const p = new URLSearchParams();
    const q = sp.get('q');
    const pageSize = sp.get('pageSize');
    if (q) p.set('q', q);
    if (pageSize) p.set('pageSize', pageSize);
    return p;
  }, [sp]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clubs</h1>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchInput />
      </div>

      {loading && (
        <div className="animate-pulse">
          <div className="h-10 w-80 bg-gray-200 rounded mb-4" />
          <div className="h-64 w-full bg-gray-200 rounded" />
        </div>
      )}

      {err && (
        <div className="border rounded-xl p-4 bg-red-50 text-red-700">
          Errore nel caricamento: {err}{' '}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="ml-3 px-3 py-1 border rounded-lg bg-white hover:bg-gray-50"
          >
            Riprova
          </button>
        </div>
      )}

      {!loading && !err && data && (
        <>
          <ClubsTable items={data.data} />
          <Pagination page={data.page} pageCount={data.pageCount} searchParams={spForPagination} />
        </>
      )}
    </div>
  );
}
