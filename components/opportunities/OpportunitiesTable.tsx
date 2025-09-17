'use client';

import Link from 'next/link';
import ApplyCell from '@/components/opportunities/ApplyCell';
import FollowButton from '@/components/clubs/FollowButton';
import type { Opportunity } from '@/types/opportunity';

function formatBracket(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunitiesTable({
  items,
  currentUserId,
  userRole = 'guest',
  onEdit,
  onDelete,
}: {
  items: Opportunity[];
  currentUserId?: string | null;
  userRole?: Role;
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
            <th className="px-4 py-2 w-40">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const canEdit = !!currentUserId && o.created_by === currentUserId;
            const place = [o.city, o.province, o.region, o.country].filter(Boolean).join(', ');
            const showApply = userRole === 'athlete' && !canEdit;

            return (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/opportunities/${o.id}`} className="hover:underline">
                    {o.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{place || '—'}</td>
                <td className="px-4 py-2">{o.sport ?? '—'}</td>
                <td className="px-4 py-2">{o.role ?? '—'}</td>
                <td className="px-4 py-2">{formatBracket(o.age_min as any, o.age_max as any)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span>{o.club_name ?? '—'}</span>
                    {/* Segui: solo per atleti */}
                    {o.created_by && userRole === 'athlete' && (
                      <FollowButton
                        clubId={o.created_by}
                        clubName={o.club_name ?? undefined}
                        size="sm"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {/* Azione principale */}
                    {showApply && (
                      <ApplyCell opportunityId={o.id} ownerId={o.created_by ?? null} />
                    )}

                    {/* Azioni extra per l'owner */}
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onEdit?.(o)}
                          className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                          type="button"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => onDelete?.(o)}
                          className="px-2 py-1 text-xs rounded border hover:bg-red-50"
                          type="button"
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
