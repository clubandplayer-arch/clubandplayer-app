'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import SearchInput from '@/components/controls/SearchInput';
import ClubsTable from '@/components/clubs/ClubsTable';
import Pagination from '@/components/pagination/Pagination';
import Modal from '@/components/ui/Modal';
import ClubForm from '@/components/clubs/ClubForm';
import type { ClubsApiResponse, Club } from '@/types/club';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Option = { value: string; label: string };

export default function ClubsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // dati tabella
  const [data, setData] = useState<ClubsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  // modali
  const [openCreate, setOpenCreate] = useState(false);
  const [editClub, setEditClub] = useState<Club | null>(null);

  // filtri (da URL)
  const [regionId, setRegionId] = useState<string>(sp.get('regionId') || '');
  const [provinceId, setProvinceId] = useState<string>(sp.get('provinceId') || '');
  const [sport, setSport] = useState<string>(sp.get('sport') || '');

  // opzioni select
  const [regions, setRegions] = useState<Option[]>([]);
  const [provinces, setProvinces] = useState<Option[]>([]);

  // costruisci querystring dai params (inclusi i nuovi filtri)
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    const q = sp.get('q');
    const page = sp.get('page');
    const pageSize = sp.get('pageSize');
    const r = sp.get('regionId');
    const pr = sp.get('provinceId');
    const s = sp.get('sport');

    if (q) p.set('q', q);
    if (page) p.set('page', page);
    if (pageSize) p.set('pageSize', pageSize);
    if (r) p.set('regionId', r);
    if (pr) p.set('provinceId', pr);
    if (s) p.set('sport', s);

    return p.toString();
  }, [sp]);

  // whoami → id utente per ownership
  useEffect(() => {
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMe(j ?? null))
      .catch(() => setMe(null));
  }, []);

  // carica opzioni regioni/province da Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [reg, prov] = await Promise.all([
          supabase.from('regions').select('id,name').order('name', { ascending: true }),
          supabase.from('provinces').select('id,name').order('name', { ascending: true }),
        ]);

        if (!cancelled) {
          const regOpts: Option[] = (reg.data ?? []).map((r: any) => ({
            value: String(r.id),
            label: String(r.name),
          }));
          const provOpts: Option[] = (prov.data ?? []).map((p: any) => ({
            value: String(p.id),
            label: String(p.name),
          }));
          setRegions(regOpts);
          setProvinces(provOpts);
        }
      } catch {
        // fallback benigno: lasciamo le liste vuote
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // fetch lista
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    fetch(`/api/clubs?${queryString}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) {
          try {
            const j = JSON.parse(text);
            throw new Error(j.error || `HTTP ${r.status}`);
          } catch {
            throw new Error(text || `HTTP ${r.status}`);
          }
        }
        return JSON.parse(text) as ClubsApiResponse;
      })
      .then((json) => !cancelled && setData(json))
      .catch((e) => !cancelled && setErr(e.message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [queryString, reloadKey]);

  const spForPagination = useMemo(() => {
    const p = new URLSearchParams();
    const q = sp.get('q');
    const pageSize = sp.get('pageSize');
    const r = sp.get('regionId');
    const pr = sp.get('provinceId');
    const s = sp.get('sport');

    if (q) p.set('q', q);
    if (pageSize) p.set('pageSize', pageSize);
    if (r) p.set('regionId', r);
    if (pr) p.set('provinceId', pr);
    if (s) p.set('sport', s);

    return p;
  }, [sp]);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value && value.trim()) params.set(name, value.trim());
    else params.delete(name);
    // reset pagina quando cambio filtri
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleDelete(c: Club) {
    if (!confirm(`Eliminare "${c.display_name || c.name}"?`)) return;
    try {
      const res = await fetch(`/api/clubs/${c.id}`, { method: 'DELETE', credentials: 'include' });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text);
          throw new Error(j.error || `HTTP ${res.status}`);
        } catch {
          throw new Error(text || `HTTP ${res.status}`);
        }
      }
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      alert(e.message || 'Errore durante eliminazione');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clubs</h1>
        <button onClick={() => setOpenCreate(true)} className="px-3 py-2 rounded-lg bg-gray-900 text-white">
          + Nuovo club
        </button>
      </div>

      {/* Barra di ricerca + filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput />

        <div className="flex flex-wrap items-center gap-2">
          {/* Regione */}
          <select
            value={regionId}
            onChange={(e) => {
              const v = e.target.value;
              setRegionId(v);
              updateParam('regionId', v);
            }}
            className="h-10 min-w-[190px] rounded-xl border px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Regione"
          >
            <option value="">Tutte le regioni</option>
            {regions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Provincia */}
          <select
            value={provinceId}
            onChange={(e) => {
              const v = e.target.value;
              setProvinceId(v);
              updateParam('provinceId', v);
            }}
            className="h-10 min-w-[180px] rounded-xl border px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Provincia"
          >
            <option value="">Tutte le province</option>
            {provinces.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Sport (testuale: evita tassonomie rigide) */}
          <input
            value={sport}
            onChange={(e) => {
              const v = e.target.value;
              setSport(v);
              // debounce leggero non necessario: aggiorniamo onChange per semplicità
              // se vuoi debounce, si può aggiungere come per SearchInput
              updateParam('sport', v);
            }}
            placeholder="Sport (es. Calcio)"
            className="h-10 w-48 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Sport"
          />

          <button
            type="button"
            onClick={() => {
              setRegionId('');
              setProvinceId('');
              setSport('');
              const params = new URLSearchParams(sp.toString());
              params.delete('regionId');
              params.delete('provinceId');
              params.delete('sport');
              params.delete('page');
              router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className="h-10 rounded-xl border px-3 text-sm font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Pulisci filtri
          </button>
        </div>
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
          <button onClick={() => setReloadKey((k) => k + 1)} className="ml-3 px-3 py-1 border rounded-lg bg-white hover:bg-gray-50">
            Riprova
          </button>
        </div>
      )}

      {!loading && !err && data && (
        <>
          <ClubsTable
            items={data.data}
            currentUserId={me?.id}
            onEdit={(c) => setEditClub(c)}
            onDelete={(c) => handleDelete(c)}
          />
          <Pagination page={data.page} pageCount={data.pageCount} searchParams={spForPagination} />
        </>
      )}

      {/* Modal Crea */}
      <Modal open={openCreate} title="Nuovo club" onClose={() => setOpenCreate(false)}>
        <ClubForm
          onCancel={() => setOpenCreate(false)}
          onSaved={() => {
            setOpenCreate(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </Modal>

      {/* Modal Edit */}
      <Modal open={!!editClub} title={`Modifica: ${editClub?.display_name || editClub?.name || ''}`} onClose={() => setEditClub(null)}>
        {editClub && (
          <ClubForm
            initial={editClub}
            onCancel={() => setEditClub(null)}
            onSaved={() => {
              setEditClub(null);
              setReloadKey((k) => k + 1);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
