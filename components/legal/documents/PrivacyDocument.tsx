'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';
import CookiePreferencesButton from '@/components/legal/CookiePreferencesButton';

const LEGAL_EMAIL = 'support@clubandplayer.com';
const BETA_EMAIL = 'beta@clubandplayer.com';

export default function PrivacyDocument() {
  const { locale } = useI18n();
  const copy = legalCopy[locale].privacy;
  return (
    <main lang={locale} className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">{copy.text01}</h1>
      <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">{copy.text02}</p>

      <p className="mt-4 text-sm">
        <a className="underline" href="#eliminazione-account">{copy.text03}</a>
      </p>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text04}</h2>
        <p>{copy.text05}{' '}
          <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>{copy.text06}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text07}</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{copy.text08}</li>
          <li>{copy.text09}</li>
          <li>{copy.text10}</li>
          <li>{copy.text11}</li>
          <li>{copy.text12}</li>
          <li>{copy.text13}</li>
        </ul>
        <p>{copy.text14}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text15}</h2>
        <p>{copy.text16}</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>{copy.text17}</li>
          <li>{copy.text18}</li>
          <li>{copy.text19}</li>
          <li>{copy.text20}</li>
          <li>{copy.text21}</li>
        </ul>
        <p>{copy.text22}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text23}</h2>
        <p>{copy.text24}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text25}</h2>
        <p>{copy.text26}</p>
        <CookiePreferencesButton label={legalCopy[locale].common.cookiePreferences} errorMessage={legalCopy[locale].common.cookieError} />
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text27}</h2>
        <p>{copy.text28}</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">{copy.text29}</h2>
        <p>{copy.text30}<a className="underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>{copy.text31}</p>
      </section>

      <section id="eliminazione-account" className="mt-8 scroll-mt-20 space-y-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
        <h2 className="text-lg font-semibold">{copy.text32}</h2>
        <p>{copy.text33}</p>
        <p>{copy.text34}</p>
        <p><a className="underline" href="mailto:support@clubandplayer.com?subject=Eliminazione%20account%20Club%20and%20Player">{copy.text35}</a></p>
        <p>{copy.text36}</p>
        <p>{copy.text37}</p>
      </section>

      <section className="mt-8 space-y-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <h2 className="text-lg font-semibold">{copy.text38}</h2>
        <p>{copy.text39}<a className="underline" href="/legal/beta">{copy.text40}</a>{copy.text41}</p>
        <p>{copy.text42}{' '}
          <a className="underline" href={`mailto:${BETA_EMAIL}`}>
            {BETA_EMAIL}
          </a>{copy.text43}</p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">{copy.text44}<time dateTime="2026-09-17">{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-09-17T00:00:00Z'))}</time>
      </p>
    </main>
  );
}
