'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  const [dismissCount, setDismissCount] = useState(() => Number(profile?.onboarding_dismiss_count) || 0);

  useEffect(() => {
    setDismissCount(Number(profile?.onboarding_dismiss_count) || 0);
    setHidden(false);
  }, [profile]);

  const reachedLimit = useMemo(() => dismissCount >= 3, [dismissCount]);

  async function handleDismiss() {
    setHidden(true);
    try {
      const res = await fetch('/api/onboarding/dismiss', { method: 'POST', credentials: 'include' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setDismissCount(Math.min(3, Number(json.onboardingDismissCount) || dismissCount + 1));
      } else {
        setDismissCount((prev) => Math.min(3, prev + 1));
      }
    } catch {
      setDismissCount((prev) => Math.min(3, prev + 1));
    }
  }

  if (hidden || isProfileComplete(profile) || reachedLimit) return null;

  return (
    <div className="rounded-3xl bg-white/90 p-4 shadow-md ring-1 ring-slate-100 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
            <MaterialIcon name="media" fontSize="medium" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-neutral-800">
              Completa questi passaggi per ottenere il massimo da Club&Player
            </p>
            <p className="text-sm text-neutral-600">
              Ti suggeriamo alcune azioni veloci per migliorare il tuo profilo e il tuo feed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:self-start">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:text-neutral-800"
          >
            <MaterialIcon name="close" fontSize="small" aria-hidden />
            Nascondi per ora
          </button>
          <span className="text-[11px] font-medium text-neutral-500 sm:text-xs">(Puoi nasconderlo al massimo 3 volte)</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="group flex flex-col justify-between gap-3 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <MaterialIcon name={step.icon} fontSize="small" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
                <p className="text-xs leading-relaxed text-neutral-600">{step.description}</p>
              </div>
            </div>
            <div>
              <Link
                href={step.href}
                className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--brand)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand)] shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:bg-[var(--brand)] hover:text-white hover:shadow-md"
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
