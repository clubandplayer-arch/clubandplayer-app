// components/applications/ApplicationsTable.tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type AthleteSummary = {
  id: string;
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
  status?: string | null; // submitted | in_review | accepted | rejected | withdrawn | pending...
  athlete_id?: string | null;
  athlete?: AthleteSummary | null;
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
      ...(kind === 'received' ? [{ key: 'athlete_id', label: 'Atleta' }] : []),
      { key: 'status', label: 'Stato' },
      { key: 'note', label: kind === 'sent' ? 'Nota (mia)' : 'Nota' },
      { key: 'actions', label: 'Azioni' },
    ],
    [kind]
  );

  const STATUS_LABEL: Record<string, string> = {
    submitted: 'Inviata',
    in_review: 'In revisione',
    pending: 'In revisione',
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
      <div className="border rounded-lg p-10 text-center text-gray-500">
        {kind === 'sent'
          ? 'Non hai ancora inviato candidature.'
          : 'Nessuna candidatura ricevuta.'}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {headers.map((h) => (
              <th key={h.key} className="text-left px-3 py-2 align-top">
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
                {/* Data */}
                <td className="px-3 py-2 align-top">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString('it-IT')
                    : '—'}
                </td>

                {/* Annuncio */}
                <td className="px-3 py-2 align-top break-words">
                  {r.opportunity_id ? (
                    (() => {
                      const fullId = r.opportunity_id ?? '';
                      const shortId =
                        fullId.length > 12 ? `${fullId.slice(0, 8)}…` : fullId;
                      return (
                        <Link
                          className="text-blue-700 hover:underline"
                          href={`/opportunities/${r.opportunity_id}`}
                          title={fullId}
                        >
                          {shortId || 'Apri annuncio'}
                        </Link>
                      );
                    })()
                  ) : (
                    '—'
                  )}
                </td>

                {/* Atleta solo per ricevute */}
                {kind === 'received' && (
                  <td className="px-3 py-2 min-w-[12rem] align-top">
                    {r.athlete_id ? (
                      <div className="flex flex-col">
                        <Link
                          className="text-blue-700 hover:underline font-medium"
                          href={`/athletes/${r.athlete_id}`}
                        >
                          {r.athlete?.display_name ||
                            r.athlete?.full_name ||
                            r.athlete_id}
                        </Link>
                        <span className="text-xs text-gray-600">
                          {[r.athlete?.role, r.athlete?.sport]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {[r.athlete?.city, r.athlete?.province, r.athlete?.region]
                            .filter(Boolean)
                            .join(' · ') || ''}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                )}

                {/* Stato */}
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

                {/* Nota */}
                <td className="px-3 py-2 max-w-[28rem] truncate align-top" title={r.note ?? ''}>
                  {r.note ?? '—'}
                </td>

                {/* Azioni */}
                <td className="px-3 py-2 align-top">
                  {kind === 'received' ? (
                    <div className="flex gap-2">
                      <button
                        disabled={savingId === r.id || sKey === 'accepted'}
                        onClick={() => updateStatus(r.id, 'accepted')}
                        className="px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Accetta
                      </button>
                      <button
                        disabled={savingId === r.id || sKey === 'rejected'}
                        onClick={() => updateStatus(r.id, 'rejected')}
                        className="px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Rifiuta
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={r.opportunity_id ? `/opportunities/${r.opportunity_id}` : '#'}
                      className="px-2 py-1 border rounded-md hover:bg-gray-50 inline-block"
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
}
