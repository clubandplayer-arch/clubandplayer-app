'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import type { OpportunitiesApiResponse, Opportunity } from '@/types/opportunity';

import { COUNTRIES, loadItalyGeo } from '@/lib/opps/geo';
import { AGE_BRACKETS, SPORTS } from '@/lib/opps/constants';

export default function OpportunitiesClient() {
  const sp = useSearchParams();
  const router = useRouter();

  // GEO (caricato da /public/geo/italy.min.json)
  const [regions, setRegions] = useState<string[]>([]);
  const [provincesByRegion, setPBR] = useState<Record<string, string[]>>({});
  const [citiesByProvince, setCBP] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let alive = true;
    loadItalyGeo()
      .then((g) => {
        if (!alive) return;
        setRegions(g.regions);
        setPBR(g.provincesByRegion);
        setCBP(g.citiesByProvince);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [data, setData] = useState<OpportunitiesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<Opportunity | null>(null);

  // costruisci querystring dai params (inclusi filtri)
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    for (const k of [
      'q',
      'page',
      'pageSize',
      'sort',
      'country',
      'region',
      'province',
      'city',
      'sport',
      'role',
      'age',
    ]) {
      const v = sp.get(k);
      if (v) p.set(k, v);
    }
    return p.toString();
  }, [sp]);

  // util per aggiornare i parametri in URL
  function setParam(name: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    if (name !== 'page') p.set('page', '1'); // reset pagina
    router.replace(`/opportunities?${p.toString()}`);
  }

  // whoami
  useEffect(() => {
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMe(j ?? null))
      .catch(() => setMe(null));
  }, []);

  // fetch lista
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    fetch(`/api/opportunities?${queryString}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const t = await r.text();
        if (!r.ok) {
          try {
            const j = JSON.parse(t);
            throw new Error(j.error || `HTTP ${r.status}`);
          } catch {
            throw new Error(t || `HTTP ${r.status}`);
          }
        }
        return JSON.parse(t) as OpportunitiesApiResponse;
      })
      .then((json) => !cancelled && setData(json))
      .catch((e) => !cancelled && setErr(e.message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [queryString, reloadKey]);

  async function handleDelete(o: Opportunity) {
    if (!confirm(`Eliminare "${o.title}"?`)) return;
    try {
      const res = await fetch(`/api/opportunities/${o.id}`, { method: 'DELETE', credentials: 'include' });
      const t = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(t);
          throw new Error(j.error || `HTTP ${res.status}`);
        } catch {
          throw new Error(t || `HTTP ${res.status}`);
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
        <h1 className="text-2xl font-semibold">Opportunità</h1>
        <button onClick={() => setOpenCreate(true)} className="px-3 py-2 rounded-lg bg-gray-900 text-white">
          + Nuova opportunità
        </button>
      </div>

      {/* Barra filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Cerca per titolo/descrizione…"
          defaultValue={sp.get('q') ?? ''}
          onChange={(e) => setParam('q', e.currentTarget.value)}
          className="w-full md:w-80 rounded-xl border px-4 py-2"
        />

        <select value={sp.get('country') ?? ''} onChange={(e) => setParam('country', e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="">Paese</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Regione/Provincia/Città per Italia */}
        {sp.get('country') === 'Italia' && (
          <>
            <select
              value={sp.get('region') ?? ''}
              onChange={(e) => {
                setParam('region', e.target.value);
                setParam('province', '');
                setParam('city', '');
              }}
              className="rounded-xl border px-3 py-2"
            >
              <option value="">Regione</option>
              {regions.map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {provincesByRegion[sp.get('region') ?? ''] ? (
              <select
                value={sp.get('province') ?? ''}
                onChange={(e) => {
                  setParam('province', e.target.value);
                  setParam('city', '');
                }}
                className="rounded-xl border px-3 py-2"
              >
                <option value="">Provincia</option>
                {provincesByRegion[sp.get('region') ?? '']?.map((p: string) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <input
                placeholder="Provincia"
                defaultValue={sp.get('province') ?? ''}
                onBlur={(e) => setParam('province', e.currentTarget.value)}
                className="rounded-xl border px-3 py-2"
              />
            )}

            {citiesByProvince[sp.get('province') ?? ''] ? (
              <select
                value={sp.get('city') ?? ''}
                onChange={(e) => setParam('city', e.target.value)}
                className="rounded-xl border px-3 py-2"
              >
                <option value="">Città</option>
                {citiesByProvince[sp.get('province') ?? '']?.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                placeholder="Città"
                defaultValue={sp.get('city') ?? ''}
                onBlur={(e) => setParam('city', e.currentTarget.value)}
                className="rounded-xl border px-3 py-2"
              />
            )}
          </>
        )}

        <select value={sp.get('sport') ?? ''} onChange={(e) => setParam('sport', e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="">Sport</option>
          {SPORTS.map((s: string) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={sp.get('age') ?? ''} onChange={(e) => setParam('age', e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="">Età</option>
          {AGE_BRACKETS.map((b: string) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <label className="text-sm text-gray-600 ml-auto">Ordina</label>
        <select value={sp.get('sort') ?? 'recent'} onChange={(e) => setParam('sort', e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="recent">Più recenti</option>
          <option value="oldest">Meno recenti</option>
        </select>

        <label className="text-sm text-gray-600">Per pagina</label>
        <select value={sp.get('pageSize') ?? '20'} onChange={(e) => setParam('pageSize', e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>

      {loading && <div className="h-64 w-full rounded-2xl bg-gray-200 animate-pulse" />}

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
        <OpportunitiesTable
          items={data.data}
          currentUserId={me?.id}
          onEdit={(o) => setEditItem(o)}
          onDelete={(o) => handleDelete(o)}
        />
      )}

      {/* Modal Crea */}
      <Modal open={openCreate} title="Nuova opportunità" onClose={() => setOpenCreate(false)}>
        <OpportunityForm
          onCancel={() => setOpenCreate(false)}
          onSaved={() => {
            setOpenCreate(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </Modal>

      {/* Modal Edit */}
      <Modal open={!!editItem} title={`Modifica: ${editItem?.title ?? ''}`} onClose={() => setEditItem(null)}>
        {editItem && (
          <OpportunityForm
            initial={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={() => {
              setEditItem(null);
              setReloadKey((k) => k + 1);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
