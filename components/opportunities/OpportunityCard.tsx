'use client';

import Link from 'next/link';
import FollowButton from '@/components/clubs/FollowButton';
import type { Opportunity, Gender } from '@/types/opportunity';

function formatBracket(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

function genderLabel(g?: Gender | null) {
  if (g === 'male') return 'Maschile';
  if (g === 'female') return 'Femminile';
  if (g === 'mixed') return 'Misto';
  return '—';
}

export default function OpportunityCard({
  opp,
  currentUserId,
  userRole = 'guest',
  // accettiamo entrambi i nomi per compatibilità
  alreadyApplied,
  hasApplied,
}: {
  opp: Opportunity;
  currentUserId?: string | null;
  userRole?: 'athlete' | 'club' | 'guest';
  alreadyApplied?: boolean;
  hasApplied?: boolean; // alias supportato per compatibilità con il feed esistente
}) {
  const place = [opp.city, opp.province, opp.region, opp.country]
    .filter(Boolean)
    .join(', ');
  const createdAt = opp.created_at ? new Date(opp.created_at).toLocaleString() : '';
  const ownerId = opp.created_by ?? opp.owner_id ?? null;

  const canApply = userRole === 'athlete';
  const applied = (alreadyApplied ?? hasApplied) ?? false;

  return (
    <article className="bg-white rounded-2xl border p-4 md:p-5 space-y-3">
      {/* Header: titolo + badge */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg md:text-xl font-semibold leading-snug">
          <Link href={`/opportunities/${opp.id}`} className="hover:underline">
            {opp.title}
          </Link>
        </h2>

        <div className="flex items-center gap-2">
          {applied && (
            <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-xs">
              Già candidato
            </span>
          )}
        </div>
      </div>

      {/* Meta principali */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        {opp.sport && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
            {opp.sport}
          </span>
        )}
        {opp.role && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
            {opp.role}
          </span>
        )}
        {opp.gender && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
            {genderLabel(opp.gender)}
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
          Età: {formatBracket(opp.age_min, opp.age_max)}
        </span>
      </div>

      {/* Club + follow + luogo/data */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-medium">{opp.club_name ?? 'Club'}</span>
          {/* Follow solo se abbiamo un ownerId valido */}
          {ownerId && <FollowButton clubId={ownerId} clubName={opp.club_name ?? undefined} />}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          {place && <span>{place}</span>}
          {createdAt && <span>• {createdAt}</span>}
        </div>
      </div>

      {/* CTA */}
      <div className="pt-2">
        {canApply ? (
          <Link
            href={`/opportunities/${opp.id}`}
            className="inline-flex items-center rounded-lg bg-gray-900 text-white px-3 py-2 text-sm"
          >
            {applied ? 'Vedi candidatura' : 'Candidati'}
          </Link>
        ) : (
          <Link
            href={`/opportunities/${opp.id}`}
            className="inline-flex items-center rounded-lg border px-3 py-2 text-sm"
          >
            Dettaglio
          </Link>
        )}
      </div>
    </article>
  );
}
