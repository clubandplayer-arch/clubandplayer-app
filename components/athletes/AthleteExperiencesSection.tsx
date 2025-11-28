'use client';

import { useMemo } from 'react';

type AthleteExperience = {
  id: string;
  club_name: string | null;
  sport: string | null;
  role: string | null;
  category: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean | null;
  description: string | null;
};

type Props = {
  experiences: AthleteExperience[];
};

function formatPeriod(exp: AthleteExperience) {
  const start = exp.start_year ?? null;
  const end = exp.is_current ? 'oggi' : exp.end_year ?? null;
  if (!start && !end) return 'Periodo non indicato';
  if (start && !end) return `${start} – —`;
  if (!start && end) return `— – ${end}`;
  return `${start} – ${end}`;
}

export default function AthleteExperiencesSection({ experiences }: Props) {
  const ordered = useMemo(
    () =>
      [...experiences].sort((a, b) => {
        const aCurrent = a.is_current ? 1 : 0;
        const bCurrent = b.is_current ? 1 : 0;
        if (aCurrent !== bCurrent) return bCurrent - aCurrent;
        const aStart = a.start_year ?? 0;
        const bStart = b.start_year ?? 0;
        if (aStart !== bStart) return bStart - aStart;
        const aEnd = a.end_year ?? 0;
        const bEnd = b.end_year ?? 0;
        return bEnd - aEnd;
      }),
    [experiences],
  );

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="heading-h2 text-xl">Esperienze sportive</h2>
      {!ordered.length && <p className="mt-3 text-sm text-neutral-700">Nessuna esperienza inserita.</p>}
      {!!ordered.length && (
        <ul className="mt-4 space-y-4">
          {ordered.map((exp) => (
            <li key={exp.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-base font-semibold text-neutral-900">{exp.club_name || 'Club non indicato'}</div>
                  <div className="text-sm text-neutral-700">
                    {[exp.role, exp.category].filter(Boolean).join(' · ') || 'Ruolo non indicato'}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    {exp.sport || 'Sport non indicato'}
                  </div>
                </div>
                <div className="text-sm font-semibold text-neutral-800">{formatPeriod(exp)}</div>
              </div>
              {exp.description && exp.description.trim().length > 0 && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{exp.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
