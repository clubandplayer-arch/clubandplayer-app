'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchInput from '@/components/controls/SearchInput';
import ClubsTable from '@/components/clubs/ClubsTable';
import Pagination from '@/components/pagination/Pagination';
import Modal from '@/components/ui/Modal';
import ClubForm from '@/components/clubs/ClubForm';
import type { ClubsApiResponse, Club } from '@/types/club';

type Props = {
  /** Se true, nasconde creazione/modifica/cancellazione e modali (sola lettura) */
  readOnly?: boolean;
};

export default function ClubsClient({ readOnly = false }: Props) {
  const sp = useSearchParams();

  const [data, setData] = useState<ClubsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  // modali
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

  // whoami → id utente per ownership (inutile in readOnly ma innocuo)
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
      .catch((e) => !cancelled && setErr((e as Error).message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));

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

  const isAuthError = err?.includes('401');

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
          {isAuthError ? (
            <>
              Devi effettuare l’accesso per vedere i club.
              <a
                href="/login"
                className="ml-3 inline-block px-3 py-1 border rounded-lg bg-white hover:bg-gray-50 underline"
              >
                Vai al login
              </a>
            </>
          ) : (
            <>
              Errore nel caricamento: {err}{' '}
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="ml-3 px-3 py-1 border rounded-lg bg-white hover:bg-gray-50"
              >
                Riprova
              </button>
            </>
          )}
        </div>
      )}

      {!loading && !err && data && (
        <>
          <ClubsTable
            items={data.data}
            currentUserId={me?.id}
            readOnly={readOnly}
            {...(!readOnly && { onEdit: (c: Club) => setEditClub(c) })}
            {...(!readOnly && { onDelete: (c: Club) => handleDelete(c) })}
          />
          <Pagination page={data.page} pageCount={data.pageCount} searchParams={spForPagination} />
        </>
      )}

      {/* Modali disabilitate in sola lettura */}
      {!readOnly && (
        <>
          <Modal open={openCreate} title="Nuovo club" onClose={() => setOpenCreate(false)}>
            <ClubForm
              onCancel={() => setOpenCreate(false)}
              onSaved={() => {
                setOpenCreate(false);
                setReloadKey((k) => k + 1);
              }}
            />
          </Modal>

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
        </>
      )}
    </div>
  );
}
