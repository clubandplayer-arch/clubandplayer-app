'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MaterialIcon, type MaterialIconName } from '@/components/icons/MaterialIcon';
import type { Profile } from '@/types/profile';
import { isProfileComplete } from '@/lib/profile/completion';

const steps: Array<{
  title: string;
  description: string;
  href: string;
  icon: MaterialIconName;
}> = [
  {
    title: 'Completa il tuo profilo',
    description: 'Aggiungi dettagli come sport, ruolo e bio per farti conoscere.',
    href: '/profile',
    icon: 'edit',
  },
  {
    title: 'Cerca club/player da seguire',
    description: 'Trova realtà interessanti vicino a te e segui i loro aggiornamenti.',
    href: '/search-map',
    icon: 'network',
  },
  {
    title: 'Guarda le opportunità per te',
    description: 'Scopri annunci e candidature adatte al tuo profilo.',
    href: '/opportunities',
    icon: 'opportunities',
  },
];

export function FirstStepsCard({ profile }: { profile?: Profile | null }) {
  const [hidden, setHidden] = useState(false);

  if (hidden || isProfileComplete(profile)) return null;

  return (
    <div className="rounded-3xl bg-surface p-5 shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-700">Benvenuto su Club&Player</p>
          <p className="text-xs text-neutral-600">Ecco 3 passi per iniziare:</p>
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-700"
        >
          Nascondi per ora
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white/60 p-3 shadow-sm transition hover:border-[var(--brand)] hover:shadow"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <MaterialIcon name={step.icon} fontSize="small" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-800">{step.title}</p>
                <p className="text-xs text-neutral-600">{step.description}</p>
              </div>
            </div>
            <div>
              <Link
                href={step.href}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                Vai
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FirstStepsCard;
