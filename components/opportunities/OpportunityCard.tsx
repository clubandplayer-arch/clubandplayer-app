'use client';

import Link from 'next/link';
import ApplyCell from '@/components/opportunities/ApplyCell';
import FollowButton from '@/components/clubs/FollowButton';
import type { Opportunity } from '@/types/opportunity';

function fmtAge(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunityCard({
  opp,
  userRole = 'guest',
  currentUserId,
  hasApplied,
}: {
  opp: Opportunity;
  userRole?: Role;
  currentUserId?: string | null;
  hasApplied?: boolean;
}) {
  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
  const isOwner = !!currentUserId && opp.created_by === currentUserId;
  const showApply = userRole === 'athlete' && !isOwner;
  const created = opp.created_at ? new Date(opp.created_at).toLocaleString() : '—';

  // gender NON è nel tipo Opportunity: leggiamolo in modo opzionale
  const rawGender = (opp as any)?.gender as 'male' | 'female' | 'mixed' | undefined | null;
  const gender =
    rawGender === 'male' ? 'Maschile' :
    rawGender === 'female' ? 'Femminile' :
    rawGender === 'mixed' ? 'Misto' : undefined;

  return (
    <article className="bg-white rounded-xl border p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">
            <Link href={`/opportunities/${opp.id}`} className="hover:underline">
              {opp.title}
            </Link>
          </h3>
          <div className="mt-1 text-xs text-gray-600 flex flex-wrap items-center gap-2">
            <span>{opp.sport ?? '—'}</span>
            <span>•</span>
            <span>{opp.role ?? '—'}</span>
            <span>•</span>
            <span>Età: {fmtAge(opp.age_min as any, opp.age_max as any)}</span>
            {gender && (
              <>
                <span>•</span>
                <span>{gender}</span>
              </>
            )}
          </div>
        </div>

        {/* CTA primaria */}
        <div className="flex items-center gap-2">
          {hasApplied && (
            <span className="text-xs rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-1">
              Già candidato
            </span>
          )}
          {showApply && (
            <ApplyCell opportunityId={opp.id} ownerId={opp.created_by ?? null} />
          )}
        </div>
      </header>

      <div className="mt-3 text-sm text-gray-700 line-clamp-4">
        {opp.description || '—'}
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium">{opp.club_name ?? 'Club'}</span>
          {/* Follow local per club (id = created_by) */}
          <FollowButton clubId={opp.created_by ?? undefined} clubName={opp.club_name ?? undefined} />
        </div>
        <div className="flex items-center gap-2">
          {place && <span>{place}</span>}
          <span>•</span>
          <span>{created}</span>
        </div>
      </footer>
    </article>
  );
}
