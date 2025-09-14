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
  status?: string | null; // submitted | accepted | rejected
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

  // 🔎 Ricerca + ordinamento
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'status' | null>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const headers = useMemo(
    () => [
      { key: 'created_at', label: 'Data', sortable: true },
      { key: 'opportunity_id', label: 'Annuncio' },
      ...(kind === 'received' ? [{ key: 'athlete_id', label: 'Atleta' }] : []),
      { key: 'status', label: 'Stato', sortable: true },
      { key: 'note', label: kind === 'sent' ? 'Nota (mia)' : 'Nota' },
      { key: 'actions', label: 'Azioni' },
    ],
    [kind]
  );

  function toggleSort(key: 'created_at' | 'status') {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = Array.isArray(rows) ? [...rows] : [];

    if (term) {
      arr = arr.filter((r) => {
        const hay = [
          r.note ?? '',
          r.status ?? '',
          r.opportunity_id ?? '',
          kind === 'received' ? (r.athlete_id ?? '') : '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      });
    }

    if (sortBy) {
      arr.sort((a, b) => {
        if (sortBy === 'created_at') {
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return sortDir === 'asc' ? da - db : db - da;
        }
        // status: submitted < accepted > rejected (ordine personalizzato)
        const weight = (s?: string | null) => {
          const v = (s ?? '').toLowerCase();
          if (v === 'accepted') return 2;
          if (v === 'submitted' || v === '') return 1;
          if (v === 'rejected') return 0;
          return 1;
        };
        const wa = weight(a.status);
        const wb = weight(b.status);
        return sortDir === 'asc' ? wa - wb : wb - wa;
      });
    }

    return arr;
  }, [rows, q, sortBy, sortDir, kind]);

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
    <div className="border rounded-lg">
      {/* Toolbar: ricerca + info risultati */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between p-3 border-b bg-gray-50">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            kind === 'received'
              ? 'Cerca per nota, stato, ID annuncio o ID atleta…'
              : 'Cerca per nota, stato o ID annuncio…'
          }
          className="w-full md:w-96 rounded-md border px-3 py-1.5"
        />
        <div className="text-sm text-gray-500">
          {filtered.length} risultati
          {q && (
            <span className="ml-2">
              (filtro: <span className="font-medium">“{q}”</span>)
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {headers.map((h) => {
                const isActive = sortBy === h.key;
                return (
                  <th key={h.key} className="text-left px-3 py-2 whitespace-nowrap">
                    {h.sortable ? (
                      <button
                        onClick={() =>
                          toggleSort(h.key as 'created_at' | 'status')
                        }
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {h.label}
                        {isActive && (
                          <span aria-hidden>
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    ) : (
                      h.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                {/* Data */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
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
                        disabled={savingId === r.id || r.status === 'accepted'}
                        onClick={() => updateStatus(r.id, 'accepted')}
                        className="px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Accetta
                      </button>
                      <button
                        disabled={savingId === r.id || r.status === 'rejected'}
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
    </div>
  );
}
