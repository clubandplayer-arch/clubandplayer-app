// components/applications/ApplicationsTable.tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { buildPlayerDisplayName } from '@/lib/displayName';
import { useRouter } from 'next/navigation';

type AthleteSummary = {
  id: string;
  name?: string | null;
  display_name: string | null;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  sport: string | null;
  role: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  avatar_url: string | null;
};

type Row = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  opportunity?: { title?: string | null } | null;
  status?: string | null; // submitted | in_review | accepted | rejected | withdrawn | pending...
  athlete_id?: string | null;
  athlete?: AthleteSummary | null;
  player_name?: string | null;
  player_headline?: string | null;
  player_location?: string | null;
  [k: string]: any;
};

export default function ApplicationsTable({
  rows,
  kind,
  loading = false,
  onStatusChange,
}: {
  rows: Row[];
  kind: 'sent' | 'received';
  loading?: boolean;
  onStatusChange?: (id: string, status: 'accepted' | 'rejected') => void;
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  const headers = useMemo(
    () => [
      { key: 'created_at', label: 'Data' },
      { key: 'opportunity_id', label: 'Annuncio' },
      ...(kind === 'received' ? [{ key: 'athlete_id', label: 'Player' }] : []),
      { key: 'status', label: 'Stato' },
      { key: 'note', label: kind === 'sent' ? 'Nota (mia)' : 'Nota' },
      { key: 'actions', label: 'Azioni' },
    ],
    [kind]
  );

  const STATUS_LABEL: Record<string, string> = {
    submitted: 'In valutazione',
    in_review: 'In valutazione',
    pending: 'In valutazione',
    accepted: 'Accettata',
    rejected: 'Rifiutata',
    withdrawn: 'Ritirata',
    open: 'Aperta',
  };

  const STATUS_CLASS: Record<string, string> = {
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-700',
    in_review: 'bg-amber-100 text-amber-800',
    pending: 'bg-amber-100 text-amber-800',
    submitted: 'bg-amber-100 text-amber-800',
    open: 'bg-gray-100 text-gray-700',
  };

  async function updateStatus(id: string, next: 'accepted' | 'rejected') {
    const msg =
      next === 'accepted'
        ? 'Confermi di ACCETTARE questa candidatura?'
        : 'Confermi di RIFIUTARE questa candidatura?';
    if (!confirm(msg)) return;

    try {
      setSavingId(id);
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `HTTP ${res.status}`);
      }

      onStatusChange?.(id, next);
    } catch (e: any) {
      alert(e?.message || 'Errore durante l’aggiornamento dello stato');
    } finally {
      setSavingId(null);
      if (!onStatusChange) {
        router.refresh();
      }
    }
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6 text-gray-600">
        Caricamento candidature…
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="rounded-lg border p-10 text-center text-gray-500">
        {kind === 'sent'
          ? 'Non hai ancora inviato candidature.'
          : 'Nessuna candidatura ricevuta.'}
      </div>
    );
  }

  const renderPlayer = (r: Row) => {
    const hasProfile = !!r.athlete;
    const athleteId = r.athlete?.id ?? r.athlete_id;
    const display = hasProfile
      ? buildPlayerDisplayName(r.athlete?.full_name, r.athlete?.display_name, 'Giocatore')
      : r.player_name || (athleteId ? 'Profilo non disponibile' : '—');
    const headline =
      r.player_headline ||
      [r.athlete?.role, r.athlete?.sport].filter(Boolean).join(' · ') ||
      null;
    const location =
      r.player_location ||
      [r.athlete?.city, r.athlete?.province, r.athlete?.region].filter(Boolean).join(' · ') ||
      '';

    return athleteId ? (
      <div className="flex flex-col">
        <Link className="font-medium text-blue-700 hover:underline" href={`/players/${athleteId}`}>
          {display}
        </Link>
        {headline ? <span className="text-xs text-gray-600">{headline}</span> : null}
        {location ? <span className="text-xs text-gray-500">{location}</span> : null}
      </div>
    ) : (
      <div className="flex flex-col">
        <span className="font-medium text-gray-800">{display}</span>
        {headline ? <span className="text-xs text-gray-600">{headline}</span> : null}
        {location ? <span className="text-xs text-gray-500">{location}</span> : null}
      </div>
    );
  };

  const TableView = (
    <div className="hidden overflow-x-auto rounded-lg border md:block">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {headers.map((h) => (
              <th key={h.key} className="px-3 py-2 text-left align-top">
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sKey = (r.status || 'submitted').toLowerCase();
            const chipLabel = STATUS_LABEL[sKey] ?? sKey;
            const chipClass =
              STATUS_CLASS[sKey] ??
              'bg-gray-100 text-gray-700';

            return (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2 align-top">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString('it-IT')
                    : '—'}
                </td>

                <td className="px-3 py-2 align-top break-words">
                  {r.opportunity_id ? (
                    (() => {
                      const fullId = r.opportunity_id ?? '';
                      const title = (r.opportunity?.title ?? '').trim();
                      const shortTitle = title
                        ? `${title.slice(0, 12)}${title.length > 12 ? '…' : ''}`
                        : '';
                      const label = shortTitle || (fullId.length > 12 ? `${fullId.slice(0, 8)}…` : fullId);
                      return (
                        <Link
                          className="text-blue-700 hover:underline"
                          href={`/opportunities/${r.opportunity_id}`}
                          title={fullId}
                        >
                          {label || 'Apri annuncio'}
                        </Link>
                      );
                    })()
                  ) : (
                    '—'
                  )}
                </td>

                {kind === 'received' && (
                  <td className="min-w-[12rem] px-3 py-2 align-top">{renderPlayer(r)}</td>
                )}

                <td className="px-3 py-2 align-top">
                  <span
                    className={[
                      'inline-block rounded-full px-2 py-0.5 text-xs capitalize',
                      chipClass,
                    ].join(' ')}
                  >
                    {chipLabel}
                  </span>
                </td>

                <td className="max-w-[28rem] truncate px-3 py-2 align-top" title={r.note ?? ''}>
                  {r.note ?? '—'}
                </td>

                <td className="px-3 py-2 align-top">
                  {kind === 'received' ? (
                    <div className="flex gap-2">
                      <button
                        disabled={savingId === r.id || sKey === 'accepted'}
                        onClick={() => updateStatus(r.id, 'accepted')}
                        className="rounded-md border px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Accetta
                      </button>
                      <button
                        disabled={savingId === r.id || sKey === 'rejected'}
                        onClick={() => updateStatus(r.id, 'rejected')}
                        className="rounded-md border px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Rifiuta
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={r.opportunity_id ? `/opportunities/${r.opportunity_id}` : '#'}
                      className="inline-block rounded-md border px-2 py-1 hover:bg-gray-50"
                    >
                      Apri annuncio
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const MobileView = (
    <div className="grid gap-3 md:hidden">
      {rows.map((r) => {
        const sKey = (r.status || 'submitted').toLowerCase();
        const chipLabel = STATUS_LABEL[sKey] ?? sKey;
        const chipClass =
          STATUS_CLASS[sKey] ??
          'bg-gray-100 text-gray-700';

        return (
          <div key={r.id} className="rounded-lg border p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 text-sm">
                <div className="text-xs text-gray-500">Data</div>
                <div className="font-medium text-gray-900">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString('it-IT')
                    : '—'}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${chipClass}`}>
                {chipLabel}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div>
                <div className="text-xs text-gray-500">Annuncio</div>
                {r.opportunity_id ? (
                  <Link
                    className="font-medium text-blue-700 hover:underline"
                    href={`/opportunities/${r.opportunity_id}`}
                  >
                    {(r.opportunity?.title || '').trim() || 'Apri annuncio'}
                  </Link>
                ) : (
                  <span className="text-gray-700">—</span>
                )}
              </div>

              {kind === 'received' && (
                <div>
                  <div className="text-xs text-gray-500">Player</div>
                  {renderPlayer(r)}
                </div>
              )}

              <div>
                <div className="text-xs text-gray-500">Nota</div>
                <div className="whitespace-pre-line text-gray-800">{r.note ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {kind === 'received' ? (
                <>
                  <button
                    disabled={savingId === r.id || sKey === 'accepted'}
                    onClick={() => updateStatus(r.id, 'accepted')}
                    className="flex-1 rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Accetta
                  </button>
                  <button
                    disabled={savingId === r.id || sKey === 'rejected'}
                    onClick={() => updateStatus(r.id, 'rejected')}
                    className="flex-1 rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Rifiuta
                  </button>
                </>
              ) : (
                <Link
                  href={r.opportunity_id ? `/opportunities/${r.opportunity_id}` : '#'}
                  className="flex-1 rounded-md border px-3 py-1 text-center text-sm hover:bg-gray-50"
                >
                  Apri annuncio
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      {TableView}
      {MobileView}
    </div>
  );
}
