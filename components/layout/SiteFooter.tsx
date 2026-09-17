'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';

export default function SiteFooter({ year }: { year: number }) {
  const { locale, t } = useI18n();
  const links = [
    { href: '/legal/privacy', label: t('common.privacy') },
    { href: '/legal/terms', label: t('common.terms') },
    { href: '/legal/beta', label: t('common.betaInfo') },
    { href: '/legal/child-safety', label: legalCopy[locale].common.childSafety },
  ];
  return (
    <footer className="border-t border-neutral-200 bg-white/90 py-6 text-sm text-neutral-600">
      <div className="container mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-wide text-neutral-500">© {year} Club and Player</p>
        <nav className="flex flex-wrap gap-4">
          {links.map((link) => <a key={link.href} href={link.href} className="hover:text-neutral-900 underline-offset-2 hover:underline">{link.label}</a>)}
        </nav>
      </div>
    </footer>
  );
}
