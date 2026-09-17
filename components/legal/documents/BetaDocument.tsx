'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';

const CONTACT = 'beta@clubandplayer.com';

export default function BetaDocument() {
  const { locale } = useI18n();
  const copy = legalCopy[locale].beta;
  const sections = [
    {
      title: copy.text01,
      body: copy.text02,
    },
    {
      title: copy.text03,
      body: copy.text04,
    },
    {
      title: copy.text05,
      body: copy.text06,
    },
    {
      title: copy.text07,
      body: copy.text08,
    },
  ];
  return (
    <main lang={locale} className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">{copy.text09}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{copy.text10}<a className="underline" href="/legal/terms">{copy.text11}</a>{copy.text12}<a className="underline" href="/legal/privacy">{copy.text13}</a>{copy.text14}</p>

      <div className="mt-8 space-y-8 text-sm text-neutral-700 dark:text-neutral-200">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 leading-6">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm"><a className="underline" href="/legal/privacy#eliminazione-account">{copy.text15}</a></p>

      <section className="mt-10 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p>{copy.text16}{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{' '}{copy.text17}</p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">{copy.text18}<time dateTime="2026-09-17">{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-09-17T00:00:00Z'))}</time>
      </p>
    </main>
  );
}
