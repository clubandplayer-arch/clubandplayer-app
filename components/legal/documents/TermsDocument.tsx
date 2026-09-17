'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';

export default function TermsDocument() {
  const { locale } = useI18n();
  const copy = legalCopy[locale].terms;
  return (
    <main lang={locale} className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">{copy.text01}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{copy.text02}</p>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text03}</h2>
        <p>{copy.text04}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text05}</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{copy.text06}</li>
          <li>{copy.text07}</li>
          <li>{copy.text08}</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text09}</h2>
        <p>{copy.text10}</p>
      </section>

      <section className="mt-8 space-y-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <h2 className="text-lg font-semibold">{copy.text11}</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{copy.text12}</li>
          <li>{copy.text13}</li>
          <li>{copy.text14}</li>
          <li>{copy.text15}</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text16}</h2>
        <p>{copy.text17}</p>
        <p>{copy.text18}<a className="underline" href="/legal/child-safety">{copy.text19}</a>{copy.text20}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text21}</h2>
        <p>{copy.text22}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text23}</h2>
        <p>{copy.text24}{' '}
          <a className="underline" href="/legal/privacy">{copy.text25}</a>{copy.text26}{' '}
          <a className="underline" href="/legal/beta">{copy.text27}</a>{copy.text28}</p>
      </section>

      <section className="mt-8 space-y-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <h2 className="text-lg font-semibold">{copy.text29}</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{copy.text30}</li>
          <li>{copy.text31}</li>
          <li>{copy.text32}</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text33}</h2>
        <p>{copy.text34}<a className="underline" href="mailto:support@clubandplayer.com">{copy.text35}</a>{copy.text36}</p>
        <p>{copy.text37}<a className="underline" href="/legal/privacy#eliminazione-account">{copy.text38}</a>{copy.text39}</p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">{copy.text40}<time dateTime="2026-09-17">{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-09-17T00:00:00Z'))}</time>
      </p>
    </main>
  );
}
