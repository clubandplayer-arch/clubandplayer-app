'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import SearchInput from '@/components/controls/SearchInput';
import ClubsTable from '@/components/clubs/ClubsTable';
import Pagination from '@/components/pagination/Pagination';
import Modal from '@/components/ui/Modal';
import ClubForm from '@/components/clubs/ClubForm';

import type { ClubsApiResponse, Club } from '@/types/club';
import { mapClubsList } from '@/lib/adapters/clubs';

type Me = { id: string; email?: string } | null;

interface Props {
  /** Se true, la pagina è in sola lettura: nasconde pulsanti/azioni */
  readOnly?: boolean;
}

export default function ClubsClient({ readOnly = false }: Props) {
  const sp = useSearchParams();

  const [data, setData] = useState<ClubsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [me, setMe] = useState<Me>(null);

  // modali (usate solo se readOnly === false)
  const [openCreate, setOpenCreate] = useState(false);
  const [editClub, setEditClub] = useState<Club | null>(null);

  // costruisci querystring dai params
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

  // whoami → id utente per ownership
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json().catch(() => null))
      .then((j) => {
        if (!cancelled) setMe(j ?? null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
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
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e: any) => {
        if (!cancelled) setErr(e?.message || 'Errore');
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

  async function handleDelete(c: Club) {
    if (readOnly) return;
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

  const items = useMemo(() => mapClubsList(data?.data), [data]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clubs</h1>
        {!readOnly && (
          <button
            onClick={() => setOpenCreate(true)}
            className="px-3 py-2 rounded-lg bg-gray-900 text-white"
          >
            + Nuovo club
          </button>
        )}
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
          <ClubsTable
            items={items}
            currentUserId={me?.id}
            onEdit={readOnly ? undefined : (c) => setEditClub(c)}
            onDelete={readOnly ? undefined : (c) => handleDelete(c)}
          />
          <Pagination page={data.page} pageCount={data.pageCount} searchParams={spForPagination} />
        </>
      )}

      {/* Modal Crea */}
      {!readOnly && (
        <Modal open={openCreate} title="Nuovo club" onClose={() => setOpenCreate(false)}>
          <ClubForm
            onCancel={() => setOpenCreate(false)}
            onSaved={() => {
              setOpenCreate(false);
              setReloadKey((k) => k + 1);
            }}
          />
        </Modal>
      )}

      {/* Modal Edit */}
      {!readOnly && (
        <Modal
          open={!!editClub}
          title={`Modifica: ${editClub?.display_name || editClub?.name || ''}`}
          onClose={() => setEditClub(null)}
        >
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
      )}
    </div>
  );
}
