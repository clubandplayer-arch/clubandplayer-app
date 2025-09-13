'use client';

import Link from 'next/link';
import ApplyCell from '@/components/opportunities/ApplyCell';
import type { Opportunity } from '@/types/opportunity';

function formatBracket(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

export default function OpportunityCard({
  opp,
  userRole = 'guest',
  currentUserId,
  hasApplied,
}: {
  opp: Opportunity;
  userRole?: 'athlete' | 'club' | 'guest';
  currentUserId?: string | null;
  hasApplied?: boolean;
}) {
  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
  const isOwner = !!currentUserId && (opp.created_by === currentUserId || opp.owner_id === currentUserId);
  const gender = opp.gender === 'male' ? 'Maschile' : opp.gender === 'female' ? 'Femminile' : opp.gender === 'mixed' ? 'Misto' : '—';

  return (
    <article className="bg-white rounded-2xl border p-4 md:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold break-words">{opp.title}</h1>
          <div className="text-sm text-gray-500">
            {opp.club_name ?? '—'} {place ? `• ${place}` : ''} • {new Date(opp.created_at).toLocaleString()}
          </div>
        </div>

        {/* CTA principale (solo atleti, non owner) */}
        <div className="shrink-0">
          {userRole === 'athlete' && !isOwner ? (
            hasApplied ? (
              <span className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm bg-green-50 text-green-700 border-green-200">
                Già candidato
              </span>
            ) : (
              <ApplyCell opportunityId={opp.id} ownerId={opp.created_by ?? null} />
            )
          ) : null}
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-gray-500">Sport</div>
          <div className="font-medium">{opp.sport ?? '—'}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-gray-500">Ruolo</div>
          <div className="font-medium">{opp.role ?? '—'}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-gray-500">Età</div>
          <div className="font-medium">{formatBracket(opp.age_min, opp.age_max)}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-gray-500">Genere</div>
          <div className="font-medium">{gender}</div>
        </div>
      </section>

      {opp.description ? (
        <section className="mt-4 text-[15px] leading-6 text-gray-800 whitespace-pre-wrap">
          {opp.description}
        </section>
      ) : null}

      {/* Footer secondario */}
      <footer className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/opportunities" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
          Torna alla lista
        </Link>
      </footer>
    </article>
  );
}
