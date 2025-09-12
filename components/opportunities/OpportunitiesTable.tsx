'use client';

import Link from 'next/link';
import ApplyCell from '@/components/opportunities/ApplyCell';
import type { Opportunity } from '@/types/opportunity';

type UserRole = 'athlete' | 'club' | 'guest';

function formatBracket(min: number | null, max: number | null) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

export default function OpportunitiesTable({
  items,
  currentUserId,
  userRole = 'guest',
  onEdit,
  onDelete,
}: {
  items: Opportunity[];
  currentUserId?: string | null;
  userRole?: UserRole;
  onEdit?: (opp: Opportunity) => void;
  onDelete?: (opp: Opportunity) => void;
}) {
  if (!items.length) {
    return (
      <div className="text-sm text-gray-500 py-8">
        Nessuna opportunità trovata. Prova a rimuovere i filtri.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2">Titolo</th>
            <th className="px-4 py-2">Luogo</th>
            <th className="px-4 py-2">Sport</th>
            <th className="px-4 py-2">Ruolo</th>
            <th className="px-4 py-2">Età</th>
            <th className="px-4 py-2">Club</th>
            <th className="px-4 py-2">Creato</th>
            <th className="px-4 py-2 w-44">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const canEdit = !!currentUserId && o.created_by === currentUserId;
            const place = [o.city, o.province, o.region, o.country].filter(Boolean).join(', ');
            return (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/opportunities/${o.id}`}
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    {o.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{place || '—'}</td>
                <td className="px-4 py-2">{o.sport ?? '—'}</td>
                <td className="px-4 py-2">{o.role ?? '—'}</td>
                <td className="px-4 py-2">{formatBracket(o.age_min, o.age_max)}</td>
                <td className="px-4 py-2">{o.club_name ?? '—'}</td>
                <td className="px-4 py-2">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {/* Azione principale: solo atleti */}
                    {userRole === 'athlete' && (
                      <ApplyCell opportunityId={o.id} ownerId={o.created_by ?? null} />
                    )}

                    {/* Azioni extra per l'owner */}
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onEdit?.(o)}
                          className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => onDelete?.(o)}
                          className="px-2 py-1 text-xs rounded border hover:bg-red-50"
                        >
                          Elimina
                        </button>
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
