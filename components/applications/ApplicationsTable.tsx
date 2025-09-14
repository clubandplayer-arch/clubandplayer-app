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
  opportunity_title?: string | null; // NEW: titolo annuncio (opzionale)
  status?: string | null;
  athlete_id?: string | null;
  athlete_name?: string | null; // NEW: nome atleta (opzionale)
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

  function fmtDate(d?: string | null) {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function shortId(id?: string | null) {
    if (!id) return '';
    return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
    }

  async function updateStatus(id: string, next: 'accepted' | 'rejected') {
    try {
      setSavingId(id);
      await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
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
    <div className="border rounded-lg overflow-x-auto">
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
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              {/* Data */}
              <td className="px-3 py-2 whitespace-nowrap">
                {fmtDate(r.created_at)}
              </td>

              {/* Annuncio */}
              <td className="px-3 py-2 whitespace-nowrap">
                {r.opportunity_id ? (
                  <Link
                    className="text-blue-700 hover:underline"
                    href={`/opportunities/${r.opportunity_id}`}
                  >
                    {r.opportunity_title?.trim() || `Annuncio ${shortId(r.opportunity_id)}`}
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
                      {r.athlete_name?.trim() || `Atleta ${shortId(r.athlete_id)}`}
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
                    r.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : r.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800',
                  ].join(' ')}
                >
                  {r.status ?? 'submitted'}
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
                      disabled={!!savingId || r.status === 'accepted'}
                      onClick={() => updateStatus(r.id, 'accepted')}
                      className="px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      {savingId === r.id ? 'Salvo…' : 'Accetta'}
                    </button>
                    <button
                      disabled={!!savingId || r.status === 'rejected'}
                      onClick={() => updateStatus(r.id, 'rejected')}
                      className="px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      {savingId === r.id ? 'Salvo…' : 'Rifiuta'}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
