'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  status?: string | null;
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

  // copia locale per update ottimistico
  const [localRows, setLocalRows] = useState<Row[]>(rows);
  useEffect(() => setLocalRows(rows), [rows]);

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

  async function updateStatus(id: string, next: 'accepted' | 'rejected') {
    // snapshot per rollback
    const before = localRows;
    // update ottimistico
    setLocalRows(prev => prev.map(r => r.id === id ? { ...r, status: next } : r));
    setSavingId(id);

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // rollback se fallisce
      setLocalRows(before);
      alert('Errore nel salvataggio dello stato.');
    } finally {
      setSavingId(null);
      router.refresh();
    }
  }

  if (loading) {
    return <div className="border rounded-lg p-6 text-gray-600">Caricamento candidature…</div>;
  }

  if (!localRows?.length) {
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
          {localRows.map((r) => (
            <tr key={r.id} className="border-t">
              {/* Data */}
              <td className="px-3 py-2 whitespace-nowrap">
                {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
              </td>

              {/* Annuncio */}
              <td className="px-3 py-2 whitespace-nowrap">
                {r.opportunity_id ? (
                  <Link className="text-blue-700 hover:underline" href={`/opportunities/${r.opportunity_id}`}>
                    {r.opportunity_id}
                  </Link>
                ) : '—'}
              </td>

              {/* Atleta solo per ricevute */}
              {kind === 'received' && (
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.athlete_id ? (
                    <Link className="text-blue-700 hover:underline" href={`/athletes/${r.athlete_id}`}>
                      {r.athlete_id}
                    </Link>
                  ) : '—'}
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
                      Accetta
                    </button>
                    <button
                      disabled={!!savingId || r.status === 'rejected'}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
