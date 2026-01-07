'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  active: 'Attivo',
  rejected: 'Rifiutato',
};

type ProfileRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  full_name: string | null;
  account_type: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  status: string | null;
  avatar_url: string | null;
  created_at: string | null;
  email?: string | null;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'rejected' | 'orphan'>('pending');
  const [error, setError] = useState<string | null>(null);

  const load = async (status: 'pending' | 'active' | 'rejected' | 'orphan') => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users?status=${status}`, { cache: 'no-store' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Non autorizzato o errore di caricamento');
      setRows([]);
      setLoading(false);
      return;
    }
    const j = await res.json().catch(() => ({}));
    setRows(((j?.data as ProfileRow[]) ?? []).slice());
    setLoading(false);
  };

  useEffect(() => {
    void load(statusFilter);
  }, [statusFilter]);

  const updateStatus = async (userId: string, nextStatus: 'active' | 'rejected') => {
    setSavingId(userId);
    const res = await fetch('/api/admin/users/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, status: nextStatus }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante il salvataggio');
    } else {
      await load(statusFilter);
    }
    setSavingId(null);
  };

  const formatLocation = (r: ProfileRow) => {
    const parts = [r.city, r.province, r.region, r.country].filter(Boolean);
    return parts.join(', ');
  };

  const getTitle = (r: ProfileRow) => {
    const cleanedName = r.full_name?.trim() || r.display_name?.trim() || '';
    if (cleanedName && !cleanedName.includes('@')) return cleanedName;
    if (r.email) return r.email;
    return 'Senza nome';
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="heading-h2 mb-4 text-2xl font-bold">Approva utenti</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Solo gli admin possono accedere. Approva o rifiuta i profili in attesa per sbloccare l&apos;accesso.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-700">
          Stato
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="ml-2 rounded-md border px-2 py-1 text-sm"
          >
            <option value="pending">In attesa</option>
            <option value="active">Attivi</option>
            <option value="rejected">Rifiutati</option>
            <option value="orphan">Senza login</option>
          </select>
        </label>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Utente</th>
              <th className="px-4 py-3 text-left font-semibold">Ruolo</th>
              <th className="px-4 py-3 text-left font-semibold">Località</th>
              <th className="px-4 py-3 text-left font-semibold">Stato</th>
              <th className="px-4 py-3 text-left font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-3" colSpan={5}>
                  Caricamento…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-neutral-600" colSpan={5}>
                  Nessun utente trovato per questo filtro.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const rowId = r.user_id ?? r.id;
                const title = getTitle(r);
                const subtitle = title === r.email ? null : r.email || r.user_id || r.id;
                const canUpdate = Boolean(r.user_id);
                return (
                <tr key={rowId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.avatar_url ? (
                        <Image
                          src={r.avatar_url}
                          alt={title || 'Avatar'}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                          {title?.slice(0, 2).toUpperCase() ?? 'NA'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{title}</div>
                        {subtitle ? <div className="text-xs text-neutral-500">{subtitle}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.account_type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{formatLocation(r) || '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-neutral-700">{STATUS_LABELS[r.status ?? 'pending']}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={!canUpdate || savingId === r.user_id || r.status === 'active'}
                        onClick={() => r.user_id && updateStatus(r.user_id, 'active')}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approva
                      </button>
                      <button
                        disabled={!canUpdate || savingId === r.user_id || r.status === 'rejected'}
                        onClick={() => r.user_id && updateStatus(r.user_id, 'rejected')}
                        className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Rifiuta
                      </button>
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
