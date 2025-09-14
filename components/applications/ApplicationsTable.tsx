// components/applications/ApplicationsTable.tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  status?: string | null; // submitted | in_review | accepted | rejected | withdrawn | pending...
  athlete_id?: string | null;
  [k: string]: any;
};

export default function ApplicationsTable({
  rows,
  kind,
  loading = false,
}: {
  rows: Row[];
  kind: 'sent' | 'received';
  loading?: boolean;
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
    } catch (e: any) {
      alert(e?.message || 'Errore durante l’aggiornamento dello stato');
    } finally {
      setSavingId(null);
      router.refresh();
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
    <div className="border rounded-lg overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {headers.map((h) => (
              <th key={h.key} className="text-left px-3 py-2 whitespace-nowrap">
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
              <tr key={r.id} className="border-t">
                {/* Data */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString('it-IT')
                    : '—'}
                </td>

                {/* Annuncio */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.opportunity_id ? (
                    <Link
                      className="text-blue-700 hover:underline"
                      href={`/opportunities/${r.opportunity_id}`}
                    >
                      {r.opportunity_id}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Atleta solo per ricevute */}
                {kind === 'received' && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.athlete_id ? (
                      <Link
                        className="text-blue-700 hover:underline"
                        href={`/athletes/${r.athlete_id}`}
                      >
                        {r.athlete_id}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                )}

                {/* Stato */}
                <td className="px-3 py-2">
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
                <td className="px-3 py-2 max-w-[28rem] truncate" title={r.note ?? ''}>
                  {r.note ?? '—'}
                </td>

                {/* Azioni */}
                <td className="px-3 py-2">
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
