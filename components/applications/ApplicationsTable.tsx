// components/applications/ApplicationsTable.tsx
'use client';

import React, { useMemo } from 'react';

type Row = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  status?: string | null;
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  club_id?: string | null;
  club_name?: string | null;
  athlete_id?: string | null;
  athlete_name?: string | null;
  [k: string]: any;
};

function Chip({ value }: { value?: string | null }) {
  const v = (value ?? 'pending').toLowerCase();
  const cls =
    v === 'accepted'
      ? 'bg-green-100 text-green-800'
      : v === 'rejected'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {value ?? 'pending'}
    </span>
  );
}

export default function ApplicationsTable({
  rows,
  kind,
  loading = false,
}: {
  rows: Row[];
  kind: 'sent' | 'received';
  loading?: boolean;
}) {
  const headers = useMemo(
    () => [
      { key: 'created_at', label: 'Data', width: 'w-40' },
      { key: 'peer', label: kind === 'sent' ? 'Annuncio / Club' : 'Atleta', width: 'w-80' },
      { key: 'status', label: 'Stato', width: 'w-28' },
      { key: 'note', label: kind === 'sent' ? 'Nota (mia)' : 'Nota', width: '' },
      { key: 'actions', label: 'Azioni', width: 'w-44' },
    ],
    [kind]
  );

  if (loading) {
    return <div className="border rounded-lg p-6 text-gray-600">Caricamento candidature…</div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="border rounded-lg p-10 text-center text-gray-500">
        {kind === 'sent' ? 'Non hai ancora inviato candidature.' : 'Nessuna candidatura ricevuta.'}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {headers.map((h) => (
              <th key={h.key} className={`text-left px-3 py-2 whitespace-nowrap ${h.width}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const created = r.created_at ? new Date(r.created_at).toLocaleString() : '—';

            // Peer per "invitate" (sent) → annuncio/club
            const peerSent = r.opportunity_id ? (
              <a
                className="text-blue-700 hover:underline"
                href={`/opportunities/${r.opportunity_id}`}
                title={r.opportunity_title ?? r.opportunity_id ?? undefined}
              >
                {r.opportunity_title ?? `Annuncio ${r.opportunity_id}`}
              </a>
            ) : r.club_id ? (
              <a
                className="text-blue-700 hover:underline"
                href={`/c/${r.club_id}`}
                title={r.club_name ?? r.club_id ?? undefined}
              >
                {r.club_name ?? `Club ${r.club_id}`}
              </a>
            ) : (
              '—'
            );

            // Peer per "ricevute" (received) → atleta
            const peerReceived = r.athlete_id ? (
              <a
                className="text-blue-700 hover:underline"
                href={`/u/${r.athlete_id}`}
                title={r.athlete_name ?? r.athlete_id ?? undefined}
              >
                {r.athlete_name ?? `Atleta ${r.athlete_id}`}
              </a>
            ) : (
              '—'
            );

            return (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{created}</td>

                <td className="px-3 py-2 whitespace-nowrap">
                  {kind === 'sent' ? peerSent : peerReceived}
                </td>

                <td className="px-3 py-2 whitespace-nowrap">
                  <Chip value={r.status} />
                </td>

                <td className="px-3 py-2 max-w-[28rem] truncate" title={r.note ?? undefined}>
                  {r.note ?? '—'}
                </td>

                <td className="px-3 py-2">
                  {kind === 'received' ? (
                    <div className="flex gap-2">
                      <button
                        disabled
                        className="px-2 py-1 border rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                        title="Accetta (presto disponibile)"
                      >
                        Accetta
                      </button>
                      <button
                        disabled
                        className="px-2 py-1 border rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                        title="Rifiuta (presto disponibile)"
                      >
                        Rifiuta
                      </button>
                    </div>
                  ) : r.opportunity_id ? (
                    <a
                      className="px-2 py-1 border rounded-md hover:bg-gray-50 inline-block"
                      href={`/opportunities/${r.opportunity_id}`}
                    >
                      Apri annuncio
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
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
