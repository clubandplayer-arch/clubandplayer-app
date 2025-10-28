'use client';

import Link from 'next/link';
import ApplyCTA from '@/components/opportunities/ApplyCTA';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';

type Props = {
  opp: Opportunity;
  _currentUserId?: string | null;
  userRole?: Role;
  alreadyApplied?: boolean;
  onApplied?: (id: string) => void;
};

export default function OpportunityCard({
  opp,
  _currentUserId,
  userRole = 'guest',
  alreadyApplied,
  onApplied,
}: Props) {
  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');

  const genderLabel =
    (opp as any).gender === 'male'
      ? 'Maschile'
      : (opp as any).gender === 'female'
      ? 'Femminile'
      : (opp as any).gender === 'mixed'
      ? 'Misto'
      : undefined;

  const ageLabel =
    opp.age_min != null && opp.age_max != null
      ? `${opp.age_min}-${opp.age_max}`
      : opp.age_min != null && opp.age_max == null
      ? `${opp.age_min}+`
      : opp.age_min == null && opp.age_max != null
      ? `≤${opp.age_max}`
      : undefined;

  const canApply = userRole === 'athlete';

  return (
    <article className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/opportunities/${opp.id}`} className="block">
            <h3 className="text-base md:text-lg font-semibold truncate">{opp.title}</h3>
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
            {opp.sport && <span>{opp.sport}</span>}
            {opp.role && <span>{opp.role}</span>}
            {genderLabel && <span>{genderLabel}</span>}
            {ageLabel && <span>Età: {ageLabel}</span>}
            {place && <span>📍 {place}</span>}
          </div>
        </div>

        {/* CTA solo per atleti */}
        {canApply && (
          <ApplyCTA
            oppId={opp.id}
            initialApplied={!!alreadyApplied}
            onApplied={() => onApplied?.(opp.id)}
            size="sm"
          />
        )}
      </div>

      {opp.description && (
        <p className="mt-3 text-sm text-gray-700 line-clamp-3">{opp.description}</p>
      )}
    </article>
  );
}
