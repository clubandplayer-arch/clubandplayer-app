// components/applications/ApplicationsTable.tsx
'use client';

import { useMemo } from 'react';

type Row = {
  id: string;
  created_at?: string | null;
  note?: string | null;
  opportunity_id?: string | null;
  status?: string | null;
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
  const headers = useMemo(
    () => [
      { key: 'created_at', label: 'Data' },
      { key: 'opportunity_id', label: 'Annuncio' },
      { key: 'status', label: 'Stato' },
      { key: 'note', label: kind === 'sent' ? 'Nota (mia)' : 'Nota' },
      { key: 'actions', label: 'Azioni' },
    ],
    [kind]
  );

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
            {headers.map(h => (
              <th key={h.key} className="text-left px-3 py-2 whitespace-nowrap">
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap">
                {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {r.opportunity_id ? (
                  <a
                    className="text-blue-700 hover:underline"
                    href={`/opportunities/${r.opportunity_id}`}
                  >
                    {r.opportunity_id}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2">{r.status ?? '—'}</td>
              <td className="px-3 py-2 max-w-[28rem] truncate" title={r.note ?? ''}>
                {r.note ?? '—'}
              </td>
              <td className="px-3 py-2">
                {kind === 'received' ? (
                  <div className="flex gap-2">
                    <button className="px-2 py-1 border rounded-md hover:bg-gray-50">
                      Apri profilo
                    </button>
                    <button className="px-2 py-1 border rounded-md hover:bg-gray-50">
                      Contatta
                    </button>
                  </div>
                ) : (
                  <button className="px-2 py-1 border rounded-md hover:bg-gray-50">
                    Apri annuncio
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
