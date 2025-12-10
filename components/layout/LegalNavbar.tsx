'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavCloseIcon, NavMenuIcon } from '@/components/icons/NavToggleIcons';
import { MaterialIcon, type MaterialIconName } from '@/components/icons/MaterialIcon';

type Role = 'athlete' | 'club' | null;

type NavItem = { label: string; href: string; icon: MaterialIconName };

type Props = {
  role: Role;
};

export default function LegalNavbar({ role }: Props) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const profileHref = role === 'club' ? '/club/profile' : '/player/profile';

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: 'Feed', href: '/feed', icon: 'home' },
      { label: 'Cerca', href: '/search-map', icon: 'globe' },
      { label: 'Opportunità', href: '/opportunities', icon: 'opportunities' },
      { label: 'Messaggi', href: '/messages', icon: 'mail' },
      { label: 'Profilo', href: profileHref, icon: 'person' },
    ],
    [profileHref],
  );

  const isActive = (href: string) => pathname === href || (!!pathname && pathname.startsWith(`${href}/`));

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/feed"
          className="heading-h2 !mt-0 !mb-0 !text-xl md:!text-2xl lg:!text-3xl font-semibold tracking-tight text-[var(--brand)]"
        >
          Club&Player
        </Link>

        <nav className="hidden flex-1 justify-center md:flex" aria-label="Navigazione principale">
          <div className="flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm backdrop-blur">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${active ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}
                >
                  <MaterialIcon name={item.icon} fontSize="small" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {role === 'club' ? (
            <Link href="/opportunities/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
              + Nuova opportunità
            </Link>
          ) : null}

          <Link href="/logout" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
            Logout
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 md:hidden"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label={isMenuOpen ? 'Chiudi menu di navigazione' : 'Apri menu di navigazione'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <NavCloseIcon fontSize="small" aria-hidden /> : <NavMenuIcon fontSize="small" aria-hidden />}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="border-t bg-white/95 shadow-sm backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex flex-1 min-w-[140px] items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'hover:bg-neutral-50'}`}
                  >
                    <MaterialIcon name={item.icon} fontSize={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              {role === 'club' ? (
                <Link
                  href="/opportunities/new"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md border px-3 py-2 text-sm font-semibold text-[var(--brand)] hover:bg-neutral-50"
                >
                  + Nuova opportunità
                </Link>
              ) : null}

              <Link
                href="/logout"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
