'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useIsClub from '@/hooks/useIsClub';
import { ToastProvider } from '@/components/common/ToastProvider';
import { FollowProvider } from '@/components/follow/FollowProvider';
import { NavCloseIcon, NavMenuIcon } from '@/components/icons/NavToggleIcons';
import { MaterialIcon, type MaterialIconName } from '@/components/icons/MaterialIcon';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';

type Role = 'athlete' | 'club' | 'guest';

type NavItem = { label: string; href: string; icon: MaterialIconName };

const navItems: NavItem[] = [
  { label: 'Feed', href: '/feed', icon: 'home' },
  { label: 'Rete', href: '/network', icon: 'network' },
  { label: 'Messaggi', href: '/messages', icon: 'mail' },
  { label: 'Notifiche', href: '/notifications', icon: 'notifications' },
  { label: 'Following', href: '/following', icon: 'following' },
  { label: 'Media', href: '/mymedia', icon: 'media' },
  { label: 'Opportunità', href: '/opportunities', icon: 'opportunities' },
  { label: 'Candidature', href: '/applications', icon: 'applications' },
  { label: 'Mappa', href: '/search-map', icon: 'globe' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>('guest');
  const [loadingRole, setLoadingRole] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        const profile = (j?.profile as any) ?? {};
        const rawStatus = typeof profile?.status === 'string' ? profile.status.toLowerCase() : null;
        const rawRole = (j?.role ?? '').toString().toLowerCase();
        const nextUrl = pathname + (window.location.search || '');

        if (!j?.user?.id) {
          router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
          return;
        }

        if (!profile?.account_type) {
          router.replace(`/onboarding/choose-role?next=${encodeURIComponent(nextUrl)}`);
          return;
        }

        if (rawStatus && rawStatus !== 'active') {
          router.replace(`/blocked?status=${encodeURIComponent(rawStatus)}`);
          return;
        }

        setRole(rawRole === 'club' || rawRole === 'athlete' ? (rawRole as Role) : 'guest');
      } catch {
        if (!cancelled) setRole('guest');
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const profileHref = role === 'club' ? '/club/profile' : '/profile';
  const isActive = (href: string) => pathname === href || (!!pathname && pathname.startsWith(href + '/'));

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        setUnreadNotifications(Number(json?.count) || 0);
      } catch {
        if (!cancelled) setUnreadNotifications(0);
      }
    };

    void loadUnread();
    const handler = () => void loadUnread();
    window.addEventListener('app:notifications-updated', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('app:notifications-updated', handler);
    };
  }, []);

  return (
    <ToastProvider>
      <FollowProvider>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
              <Link
                href="/feed"
            className="heading-h2 !mt-0 !mb-0 !text-xl md:!text-2xl lg:!text-3xl font-semibold tracking-tight text-[var(--brand)]"
          >
            Club&Player
          </Link>

          <nav className="hidden flex-1 justify-center md:flex">
            <div className="flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm backdrop-blur">
              {navItems.map((item) => {
                const active = isActive(item.href);
                if (item.href === '/notifications') {
                  return (
                    <div key={item.href} className="flex h-10 w-10 items-center justify-center">
                      <NotificationsDropdown
                        unreadCount={unreadNotifications}
                        onUnreadChange={(v) => setUnreadNotifications(Math.max(0, v))}
                      />
                    </div>
                  );
                }

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
                        {item.href === '/notifications' && unreadNotifications > 0 && (
                          <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                            {unreadNotifications}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

              <div className="flex flex-col gap-2">
                {isClub && (
                  <Link
                    href="/opportunities/new"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-md border px-3 py-2 text-sm font-semibold text-[var(--brand)] hover:bg-neutral-50"
                  >
                    + Nuova opportunità
                  </Link>
                )}

                {!loadingRole && (
                  <Link
                    href={profileHref}
                    onClick={() => setIsMenuOpen(false)}
                    className={`rounded-md border px-3 py-2 text-sm ${isActive(profileHref) ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'hover:bg-neutral-50'}`}
                  >
                    Profilo
                  </Link>
                )}

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

          <main className="flex-1">{children}</main>
        </div>
      </FollowProvider>
    </ToastProvider>
  );
}
