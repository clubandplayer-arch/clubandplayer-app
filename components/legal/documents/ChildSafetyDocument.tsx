'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';

const SAFETY_EMAIL = 'support@clubandplayer.com';

export default function ChildSafetyDocument() {
  const { locale } = useI18n();
  const copy = legalCopy[locale].childSafety;
  return (
    <main lang={locale} className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">{copy.text01}</h1>

      <section className="space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <p>{copy.text02}</p>
        <p>{copy.text03}</p>
      </section>

      <section aria-labelledby="csae" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="csae" className="text-lg font-semibold">{copy.text04}</h2>
        <p>{copy.text05}</p>
        <p>{copy.text06}</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>{copy.text07}</li>
          <li>{copy.text08}</li>
          <li>{copy.text09}</li>
        </ul>
      </section>

      <section aria-labelledby="csam" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="csam" className="text-lg font-semibold">{copy.text10}</h2>
        <p>{copy.text11}</p>
        <p>{copy.text12}</p>
      </section>

      <section aria-labelledby="segnalazioni" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="segnalazioni" className="text-lg font-semibold">{copy.text13}</h2>
        <p>{copy.text14}</p>
        <p>{copy.text15}</p>
      </section>

      <section aria-labelledby="interventi" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="interventi" className="text-lg font-semibold">{copy.text16}</h2>
        <p>{copy.text17}</p>
        <p>{copy.text18}</p>
      </section>

      <section aria-labelledby="contatto" className="mt-8 space-y-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
        <h2 id="contatto" className="text-lg font-semibold">{copy.text19}</h2>
        <p>{copy.text20}{' '}
          <a className="underline" href={`mailto:${SAFETY_EMAIL}`}>
            {SAFETY_EMAIL}
          </a>
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">{copy.text21}<time dateTime="2026-09-17">{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-09-17T00:00:00Z'))}</time>
      </p>
    </main>
  );
}
