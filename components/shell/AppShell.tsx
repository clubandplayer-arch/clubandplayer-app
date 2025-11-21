'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { usePathname } from 'next/navigation';
import useIsClub from '@/hooks/useIsClub';

type Role = 'athlete' | 'club' | 'guest';

type IconProps = { className?: string };

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <path d="M3 10.5 12 4l9 6.5v8.25a1.25 1.25 0 0 1-1.25 1.25H15v-6h-6v6H4.25A1.25 1.25 0 0 1 3 18.75Z" />
      <path d="M9 21h6" />
    </svg>
  );
}

function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 8 8 5 8-5" />
    </svg>
  );
}

function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <path d="M4 11v2c0 1.1.9 2 2 2h2.5l.5 3a2 2 0 0 0 2 1.8H12" />
      <path d="M6 13.5 18 18V6L6 10.5" />
    </svg>
  );
}

function StadiumIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <path d="M4 7h16v6.5c0 2.5-3.5 4.5-8 4.5s-8-2-8-4.5Z" />
      <path d="M4 10c0 2.5 3.5 4.5 8 4.5s8-2 8-4.5" />
      <path d="M9 7V4.5l3 1.5 3-1.5V7" />
    </svg>
  );
}

function MediaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M10 9.5 15 12l-5 2.5Z" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <path d="m5 13 4 4 10-10" />
    </svg>
  );
}

function HandIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <path d="M8 12V6.5a1.5 1.5 0 1 1 3 0V11" />
      <path d="M11 8V5.5a1.5 1.5 0 1 1 3 0V10" />
      <path d="M14 8.5V6a1.5 1.5 0 1 1 3 0v6.5" />
      <path d="M8 11.5a1.5 1.5 0 0 0-3 0V13c0 4 2.5 7 7 7 3.5 0 5.5-2.5 5.5-6.5V12" />
    </svg>
  );
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden className={className} {...strokeProps}>
      <circle cx="11" cy="11" r="6" />
      <path d="m15.5 15.5 3.5 3.5" />
    </svg>
  );
}

type NavItem = { label: string; href: string; icon: (props: IconProps) => ReactElement };

const navItems: NavItem[] = [
  { label: 'Feed', href: '/feed', icon: HomeIcon },
  { label: 'Messaggi', href: '/messages', icon: MailIcon },
  { label: 'Notifiche', href: '/notifications', icon: MegaphoneIcon },
  { label: 'Following', href: '/following', icon: StadiumIcon },
  { label: 'Media', href: '/mymedia', icon: MediaIcon },
  { label: 'Opportunità', href: '/opportunities', icon: CheckIcon },
  { label: 'Candidature', href: '/applications', icon: HandIcon },
  { label: 'Mappa', href: '/search-map', icon: SearchIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [role, setRole] = useState<Role>('guest');
  const [loadingRole, setLoadingRole] = useState(true);

  // unica fonte affidabile per la CTA
  const { isClub } = useIsClub();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ruolo “generico” per le voci di menu
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'club' || raw === 'athlete' ? (raw as Role) : 'guest');
      } catch {
        if (!cancelled) setRole('guest');
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const profileHref = role === 'club' ? '/club/profile' : '/profile';
  const isActive = (href: string) => pathname === href || (!!pathname && pathname.startsWith(href + '/'));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/feed" className="text-lg font-semibold tracking-tight text-[var(--brand)]">
            Club&Player
          </Link>

          <nav className="flex flex-1 justify-center">
            <div className="flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm backdrop-blur">
              {navItems.map((item) => {
                const ActiveIcon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${active ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}
                  >
                    <ActiveIcon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* CTA sempre e solo per club (usiamo useIsClub) */}
            {isClub && (
              <Link href="/opportunities/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
                + Nuova opportunità
              </Link>
            )}

            {!loadingRole && (
              <Link
                href={profileHref}
                className={`rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 ${isActive(profileHref) ? 'bg-gray-50' : ''}`}
              >
                Profilo
              </Link>
            )}

            <Link href="/logout" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
