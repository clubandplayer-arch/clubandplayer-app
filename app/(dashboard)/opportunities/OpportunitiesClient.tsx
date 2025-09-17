'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import type { OpportunitiesApiResponse, Opportunity } from '@/types/opportunity';

import { COUNTRIES, ITALY_REGIONS, PROVINCES_BY_REGION, CITIES_BY_PROVINCE } from '@/lib/opps/geo';
import { AGE_BRACKETS, SPORTS } from '@/lib/opps/constants';

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunitiesClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<OpportunitiesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');
  const [profileType, setProfileType] = useState<string>('');

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<Opportunity | null>(null);

  /** costruisce la query dai param presenti (solo quelli supportati) */
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    for (const k of [
      'q', 'page', 'pageSize', 'sort',
      'country', 'region', 'province', 'city',
      'sport', 'role', 'age',
    ]) {
      const v = sp.get(k);
      if (v) p.set(k, v);
    }
    return p.toString();
  }, [sp]);

  /** helper generico per aggiornare un parametro */
  function setParam(name: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    if (name !== 'page') p.set('page', '1');
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');
  }

  /** reset filtri e torna a page=1 (usato dopo create) */
  function resetFiltersAndReload() {
    const p = new URLSearchParams();
    p.set('sort', sp.get('sort') ?? 'recent');
    p.set('page', '1');
    p.set('pageSize', sp.get('pageSize') ?? '20');
    router.replace(`/opportunities?${p.toString()}`);
    setReloadKey(k => k + 1);
    router.refresh();
  }

  // 1) whoami
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = (j?.role ?? '').toString().toLowerCase();
        if (raw === 'club' || raw === 'athlete') setRole(raw as Role);
        else setRole('guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) fallback ruolo da /api/profiles/me
  useEffect(() => {
    let cancelled = false;
    if (!meId) return;
    if (role === 'club' || role === 'athlete') return;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const t = (j?.type ?? j?.profile?.type ?? '').toString().toLowerCase();
        setProfileType(t);
        if (t.startsWith('club')) setRole('club');
        else if (t === 'athlete') setRole('athlete');
      } catch { /* noop */ }
    })();

    return () => { cancelled = true; };
  }, [meId, role]);

  const isClub = role === 'club' || profileType.startsWith('club');

  // 3) apri modale da ?new=1 e pulisci l'URL
  useEffect(() => {
    const shouldOpen =
      sp.get('new') === '1' ||
      (typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('new') === '1');

    if (!shouldOpen) return;

    const t = setTimeout(() => setOpenCreate(true), 0);

    const p = new URLSearchParams(sp.toString());
    p.delete('new');
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');

    return () => clearTimeout(t);
  }, [sp, router]);

  // 4) carica lista (⚠ usa /api/opportunities)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    const url = queryString ? `/api/opportunities?${queryString}` : '/api/opportunities';

    fetch(url, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const t = await r.text();
        if (!r.ok) {
          try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${r.status}`); }
          catch { throw new Error(t || `HTTP ${r.status}`); }
        }
        return JSON.parse(t) as OpportunitiesApiResponse;
      })
      .then((json) => !cancelled && setData(json))
      .catch((e) => !cancelled && setErr(e.message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [queryString, reloadKey]);

  async function handleDelete(o: Opportunity) {
    if (!confirm(`Eliminare "${o.title}"?`)) return;
    try {
      const res = await fetch(`/api/opportunities/${o.id}`, { method: 'DELETE', credentials: 'include' });
      const t = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${res.status}`); }
        catch { throw new Error(t || `HTTP ${res.status}`); }
      }
      setReloadKey(k => k + 1);
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Errore durante eliminazione');
    }
  }

  /** items robusto, anche se l’API restituisce direttamente un array */
  const items: Opportunity[] = useMemo(() => {
    const d: any = data as any;
    if (Array.isArray(d)) return d as Opportunity[];
    if (Array.isArray(d?.data)) return d.data as Opportunity[];
    return [];
  }, [data]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Opportunità</h1>
        {/* CTA spostata nel topbar (link /opportunities?new=1) */}
      </div>

      {/* FILTRI */}
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
            <option key={c.code} value={c.label}>{c.label}</option>
          ))}
        </select>

        {sp.get('country') === 'Italia' && (
          <>
            <select
              value={sp.get('region') ?? ''}
              onChange={(e) => { setParam('region', e.target.value); setParam('province', ''); setParam('city', ''); }}
              className="rounded-xl border px-3 py-2"
            >
              <option value="">Regione</option>
              {ITALY_REGIONS.map((r: string) => <option key={r} value={r}>{r}</option>)}
            </select>

            {PROVINCES_BY_REGION[sp.get('region') ?? ''] ? (
              <select
                value={sp.get('province') ?? ''}
                onChange={(e) => { setParam('province', e.target.value); setParam('city', ''); }}
                className="rounded-xl border px-3 py-2"
              >
                <option value="">Provincia</option>
                {PROVINCES_BY_REGION[sp.get('region') ?? '']?.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input
                placeholder="Provincia"
                defaultValue={sp.get('province') ?? ''}
                onBlur={(e) => setParam('province', e.currentTarget.value)}
                className="rounded-xl border px-3 py-2"
              />
            )}

            {CITIES_BY_PROVINCE[sp.get('province') ?? ''] ? (
              <select
                value={sp.get('city') ?? ''}
                onChange={(e) => setParam('city', e.target.value)}
                className="rounded-xl border px-3 py-2"
              >
                <option value="">Città</option>
                {CITIES_BY_PROVINCE[sp.get('province') ?? '']?.map((c: string) => <option key={c} value={c}>{c}</option>)}
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
          {SPORTS.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={sp.get('age') ?? ''} onChange={(e) => setParam('age', e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="">Età</option>
          {AGE_BRACKETS.map((b: string) => <option key={b} value={b}>{b}</option>)}
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
          <button onClick={() => setReloadKey(k => k + 1)} className="ml-3 px-3 py-1 border rounded-lg bg-white hover:bg-gray-50">
            Riprova
          </button>
        </div>
      )}

      {!loading && !err && (
        <OpportunitiesTable
          items={items}
          currentUserId={meId ?? undefined}
          userRole={role}
          onEdit={(o) => setEditItem(o)}
          onDelete={(o) => handleDelete(o)}
        />
      )}

      {/* Modale creazione: si apre anche da ?new=1 */}
      <Modal open={openCreate} title="Nuova opportunità" onClose={() => setOpenCreate(false)}>
        {isClub ? (
          <OpportunityForm
            onCancel={() => setOpenCreate(false)}
            onSaved={() => {
              setOpenCreate(false);
              // dopo il salvataggio mostriamo subito la nuova riga
              resetFiltersAndReload(); // svuota filtri, torna a page=1 e ricarica
            }}
          />
        ) : (
          <div className="text-sm text-gray-600">Devi essere un club per creare un’opportunità.</div>
        )}
      </Modal>

      <Modal open={!!editItem} title={`Modifica: ${editItem?.title ?? ''}`} onClose={() => setEditItem(null)}>
        {editItem && (
          <OpportunityForm
            initial={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={() => {
              setEditItem(null);
              setReloadKey(k => k + 1);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
