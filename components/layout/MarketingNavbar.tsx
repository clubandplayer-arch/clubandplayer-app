'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';
import BrandLogo from '@/components/brand/BrandLogo';

export default function MarketingNavbar() {
  const { locale } = useI18n();
  const copy = legalCopy[locale].common;
  const links = [{ href: '/signup', label: copy.signup }, { href: '/login', label: copy.login }];
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <BrandLogo variant="header" href="/feed" priority className="h-8 w-auto" />

        <nav aria-label={copy.navLabel} className="flex items-center gap-2 text-sm text-neutral-700">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
