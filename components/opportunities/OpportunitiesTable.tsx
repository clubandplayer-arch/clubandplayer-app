'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ApplyCell from '@/components/opportunities/ApplyCell';
import FollowButton from '@/components/common/FollowButton';
import { useToast } from '@/components/common/ToastProvider';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';

function formatBracket(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

function fmtDateHuman(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function OpportunitiesTable({
  items,
  currentUserId,
  userRole = 'guest',
  clubNames,
  onEdit,
  onDelete,
}: {
  items: Opportunity[];
  currentUserId?: string | null;
  userRole?: Role;
  clubNames?: Record<string, string>;
  onEdit?: (opp: Opportunity) => void;
  onDelete?: (opp: Opportunity) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const ownerNameMap = useMemo(() => clubNames ?? {}, [clubNames]);

  if (!items.length) {
    return (
      <div className="text-sm text-gray-500 py-8">
        Nessuna opportunità trovata. Prova a rimuovere i filtri.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((o) => {
        const ownerId = (o as any).club_id ?? o.created_by ?? o.owner_id ?? null;
        const profileOwnerId = (o as any).club_id ?? ownerId;
        const canEdit = !!currentUserId && (ownerId === currentUserId || o.created_by === currentUserId || o.owner_id === currentUserId);
        const place = [o.city, o.province, o.region, o.country].filter(Boolean).join(', ');
        const showApply = userRole === 'athlete' && !canEdit;
        const showFollow = userRole === 'athlete' && !!profileOwnerId;
        const clubLabel =
          (o as any).clubName ||
          o.club_name ||
          (ownerId ? ownerNameMap[ownerId] : undefined) ||
          '—';

        return (
          <article key={o.id} className="rounded-2xl border bg-white/80 shadow-sm p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                  {o.status && <span className="rounded-full border px-2 py-1">{o.status}</span>}
                  <span>Pubblicata il {fmtDateHuman((o as any).created_at ?? (o as any).createdAt)}</span>
                </div>

                <Link href={`/opportunities/${o.id}`} className="group inline-flex items-start gap-2">
                  <h3 className="text-lg font-semibold group-hover:underline">{o.title}</h3>
                </Link>

                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  {o.sport && <span className="rounded-full bg-gray-100 px-2.5 py-1">{o.sport}</span>}
                  {o.role && <span className="rounded-full bg-gray-100 px-2.5 py-1">{o.role}</span>}
                  <span className="rounded-full bg-gray-100 px-2.5 py-1">Età: {formatBracket(o.age_min as any, o.age_max as any)}</span>
                  {place && <span className="rounded-full bg-gray-100 px-2.5 py-1">📍 {place}</span>}
                </div>

                {o.description && (
                  <p className="text-sm text-gray-700 line-clamp-2">{o.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {profileOwnerId ? (
                      <Link href={`/clubs/${profileOwnerId}`} className="hover:underline">
                        {clubLabel}
                      </Link>
                    ) : (
                      clubLabel
                    )}
                  </span>
                {showFollow && (
                  <FollowButton
                    targetProfileId={profileOwnerId as string}
                    size="sm"
                  />
                )}
                  <span className="text-gray-500">•</span>
                  <Link href={`/opportunities/${o.id}`} className="text-blue-700 hover:underline">
                    Dettagli annuncio
                  </Link>
                  {profileOwnerId && (
                    <Link href={`/clubs/${profileOwnerId}`} className="text-blue-700 hover:underline">
                      Visita profilo club
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex flex-row flex-wrap items-center gap-2 md:flex-col md:items-end">
                {showApply && <ApplyCell opportunityId={o.id} ownerId={ownerId} />}

                <button
                  type="button"
                  disabled={saving === o.id}
                  onClick={() => {
                    setSaving(o.id);
                    toast.info('Salvataggio opportunità in arrivo');
                    setTimeout(() => setSaving(null), 800);
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  {saving === o.id ? '... ' : 'Salva'}
                </button>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit?.(o)}
                      className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                      type="button"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => onDelete?.(o)}
                      className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      type="button"
                    >
                      Elimina
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
