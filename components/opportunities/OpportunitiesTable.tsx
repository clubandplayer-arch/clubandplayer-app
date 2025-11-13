'use client';

import Link from 'next/link';
import ApplyCell from '@/components/opportunities/ApplyCell';
import type { Opportunity } from '@/types/opportunity';

type Props = {
  items: Opportunity[];
  currentUserId?: string | null;
  userRole?: 'athlete' | 'club' | string | null;
  onEdit?: (opportunity: Opportunity) => void;
  onDelete?: (opportunity: Opportunity) => void;
};

function formatLocation(opportunity: Opportunity) {
  const city = opportunity.city ?? '';
  const region = (opportunity as any).region ?? '';
  const country = opportunity.country ?? '';
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function formatCreatedAt(opportunity: Opportunity) {
  const raw =
    (opportunity as any).created_at ??
    (opportunity as any).createdAt ??
    (opportunity as any).created_at ?? null;

  if (!raw) return '—';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString();
}

export default function OpportunitiesTable({
  items,
  currentUserId,
  userRole,
  onEdit,
  onDelete,
}: Props) {
  const isClub = (userRole ?? '').toLowerCase().includes('club');

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-gray-500">
        Nessuna opportunità trovata.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Titolo</th>
            <th className="px-4 py-3">Ruolo</th>
            <th className="px-4 py-3">Località</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3">Creato</th>
            <th className="px-4 py-3 text-right">Azioni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((opportunity) => {
            const ownerId =
              (opportunity as any).owner_id ??
              (opportunity as any).created_by ??
              null;
            const isOwner = !!currentUserId && !!ownerId && ownerId === currentUserId;
            const status = opportunity.status ?? (opportunity as any).status ?? '—';

            return (
              <tr key={opportunity.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/opportunities/${opportunity.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {opportunity.title || `#${opportunity.id}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {opportunity.role ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">{formatLocation(opportunity)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{formatCreatedAt(opportunity)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {!isOwner && (
                      <ApplyCell
                        opportunityId={String(opportunity.id)}
                        ownerId={ownerId}
                        className="shrink-0"
                      />
                    )}

                    {isOwner && (
                      <>
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(opportunity)}
                            className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Modifica
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(opportunity)}
                            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Elimina
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
