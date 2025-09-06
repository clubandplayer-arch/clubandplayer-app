'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import type { OpportunitiesApiResponse, Opportunity } from '@/types/opportunity';

export default function OpportunitiesClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<OpportunitiesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<Opportunity | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    const q = sp.get('q'); const page = sp.get('page'); const pageSize = sp.get('pageSize'); const sort = sp.get('sort');
    if (q) p.set('q', q);
    if (page) p.set('page', page);
    if (pageSize) p.set('pageSize', pageSize);
    if (sort) p.set('sort', sort);
    return p.toString();
  }, [sp]);

  useEffect(() => {
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json()).then(j => setMe(j ?? null)).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    fetch(`/api/opportunities?${queryString}`, { credentials: 'include', cache: 'no-store' })
      .then(async r => {
        const t = await r.text();
        if (!r.ok) { try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${r.status}`); } catch { throw new Error(t || `HTTP ${r.status}`); } }
        return JSON.parse(t) as OpportunitiesApiResponse;
      })
      .then(json => !cancelled && setData(json))
      .catch(e => !cancelled && setErr(e.message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [queryString, reloadKey]);

  function setParam(name: string, value: string) {
    const p = new URLSearchParams(sp);
    if (value) p.set(name, value); else p.delete(name);
    if (name !== 'page') p.set('page', '1');
    router.replace(`/opportunities?${p.toString()}`);
  }

  async function handleDelete(o: Opportunity) {
    if (!confirm(`Eliminare "${o.title}"?`)) return;
    try {
      const res = await fetch(`/api/opportunities/${o.id}`, { method: 'DELETE', credentials: 'include' });
      const t = await res.text();
      if (!res.ok) { try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${res.status}`); } catch { throw new Error(t || `HTTP ${res.status}`); } }
      setReloadKey(k => k + 1);
    } catch (e: any) { alert(e.message || 'Errore durante eliminazione'); }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Opportunità</h1>
        <button onClick={() => setOpenCreate(true)} className="px-3 py-2 rounded-lg bg-gray-900 text-white">+ Nuova opportunità</button>
      </div>

      <div className="flex items-center gap-3">
        <input
          placeholder="Cerca per titolo o descrizione..."
          defaultValue={sp.get('q') ?? ''}
          onChange={(e) => setParam('q', e.currentTarget.value)}
          className="w-full md:w-96 rounded-xl border px-4 py-2 outline-none focus:ring"
          aria-label="Cerca"
        />
        <label className="text-sm text-gray-600">Ordina</label>
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
          onSaved={() => { setOpenCreate(false); setReloadKey(k => k + 1); }}
        />
      </Modal>

      {/* Modal Edit */}
      <Modal open={!!editItem} title={`Modifica: ${editItem?.title ?? ''}`} onClose={() => setEditItem(null)}>
        {editItem && (
          <OpportunityForm
            initial={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={() => { setEditItem(null); setReloadKey(k => k + 1); }}
          />
        )}
      </Modal>
    </div>
  );
}
