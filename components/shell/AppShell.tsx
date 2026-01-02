'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Plus, Search, Users } from 'lucide-react';
import useIsClub from '@/hooks/useIsClub';
import { ToastProvider } from '@/components/common/ToastProvider';
import { FollowProvider } from '@/components/follow/FollowProvider';
import { NavCloseIcon, NavMenuIcon } from '@/components/icons/NavToggleIcons';
import { MaterialIcon, type MaterialIconName } from '@/components/icons/MaterialIcon';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { useUnreadDirectThreads } from '@/hooks/useUnreadDirectThreads';
import { MessagingDock } from '@/components/messaging/MessagingDock';
import { useNotificationsBadge } from '@/hooks/useNotificationsBadge';
import BrandLogo from '@/components/brand/BrandLogo';

type Role = 'athlete' | 'club' | 'guest';

type NavItem = { label: string; href: string; icon: MaterialIconName };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>('guest');
  const [_loadingRole, setLoadingRole] = useState(true);
  const unreadDirectThreads = useUnreadDirectThreads();
  const { unreadCount: unreadNotifications, setUnreadCount: setUnreadNotifications } = useNotificationsBadge();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const profileHref = role === 'club' ? '/club/profile' : '/player/profile';
  const applicationsHref = role === 'club' ? '/club/applications' : '/applications';

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: 'Feed', href: '/feed', icon: 'home' },
      { label: 'Opportunità', href: '/opportunities', icon: 'opportunities' },
      { label: 'Candidature', href: applicationsHref, icon: 'applications' },
      { label: 'Messaggi', href: '/messages', icon: 'mail' },
      { label: 'Notifiche', href: '/notifications', icon: 'notifications' },
      { label: 'Profilo', href: profileHref, icon: 'person' },
    ],
    [applicationsHref, profileHref],
  );

  const isActive = (href: string) => pathname === href || (!!pathname && pathname.startsWith(href + '/'));

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <ToastProvider>
      <FollowProvider>
        <div className="min-h-screen bg-clubplayer-gradient">
          <header className="fixed inset-x-0 top-0 z-40 border-b bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
              <div className="min-w-0 flex h-10 flex-shrink-0 items-center overflow-hidden">
                <BrandLogo variant="header" href="/feed" priority />
              </div>
              <form
                className="flex flex-1 items-center md:flex-none md:w-80"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = searchQuery.trim();
                  if (!trimmed) return;
                  router.push(`/search?q=${encodeURIComponent(trimmed)}&type=all`);
                }}
              >
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cerca club, player, opportunità, post, eventi…"
                    aria-label="Cerca"
                    className="h-10 w-full rounded-full border border-slate-200 bg-white/90 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
                  />
                </div>
              </form>

              <nav className="hidden flex-1 justify-center md:flex">
                <div className="flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm backdrop-blur">
                  {isClub && (
                    <>
                      <Link
                        href="/following"
                        aria-label="Seguiti"
                        aria-current={isActive('/following') ? 'page' : undefined}
                        title="Seguiti"
                        className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                          isActive('/following') ? 'bg-slate-100 text-slate-800 shadow-sm' : 'hover:bg-slate-50'
                        }`}
                      >
                        <Users size={18} aria-hidden />
                        <span className="sr-only">Seguiti</span>
                      </Link>
                      <Link
                        href="/club/roster"
                        aria-label="Rosa"
                        aria-current={isActive('/club/roster') ? 'page' : undefined}
                        title="Rosa"
                        className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-pink-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                          isActive('/club/roster') ? 'bg-pink-100 text-pink-700 shadow-sm' : 'hover:bg-pink-50'
                        }`}
                      >
                        <MaterialIcon name="following" fontSize="small" />
                        <span className="sr-only">Rosa</span>
                      </Link>
                    </>
                  )}
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    if (item.href === '/notifications') {
                      return (
                        <div key={item.href} className="flex h-10 w-10 items-center justify-center">
                          <NotificationsDropdown
                            unreadCount={unreadNotifications}
                            onUnreadChange={(v) => setUnreadNotifications(Math.max(0, v))}
                            active={active}
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
                        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                          active ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        <MaterialIcon name={item.icon} fontSize="small" />
                        <span className="sr-only">{item.label}</span>
                        {item.href === '/messages' && unreadDirectThreads > 0 && (
                          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                            {unreadDirectThreads > 9 ? '9+' : unreadDirectThreads}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              <div className="ml-auto hidden items-center gap-2 md:flex">
                {/* CTA sempre e solo per club (usiamo useIsClub) */}
                {isClub && (
                  <Link
                    href="/opportunities/new"
                    aria-label="Nuova opportunità"
                    title="Nuova opportunità"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Link>
                )}

                <Link
                  href="/logout"
                  aria-label="Esci"
                  title="Esci"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
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
                    {isClub && (
                      <>
                        <Link
                          href="/following"
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex flex-1 min-w-[140px] items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            isActive('/following')
                              ? 'border-slate-300 bg-slate-50 text-slate-800'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Users size={16} aria-hidden />
                          <span>Seguiti</span>
                        </Link>
                        <Link
                          href="/club/roster"
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex flex-1 min-w-[140px] items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            isActive('/club/roster')
                              ? 'border-pink-400 bg-pink-50 text-pink-700'
                              : 'hover:bg-pink-50 text-pink-700'
                          }`}
                        >
                          <MaterialIcon name="following" fontSize={16} />
                          <span>Rosa</span>
                        </Link>
                      </>
                    )}
                    {navItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex flex-1 min-w-[140px] items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            active ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'hover:bg-neutral-50'
                          }`}
                        >
                          <MaterialIcon name={item.icon} fontSize={16} />
                          <span>{item.label}</span>
                          {item.href === '/notifications' && unreadNotifications > 0 && (
                            <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                              {unreadNotifications}
                            </span>
                          )}
                          {item.href === '/messages' && unreadDirectThreads > 0 && (
                            <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                              {unreadDirectThreads > 9 ? '9+' : unreadDirectThreads}
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
                        aria-label="Nuova opportunità"
                        title="Nuova opportunità"
                        onClick={() => setIsMenuOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </Link>
                    )}

                    <Link
                      href="/logout"
                      aria-label="Esci"
                      title="Esci"
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </header>

          <div className="flex min-h-screen flex-col pt-16">
            <main className="flex-1">{children}</main>

            <MessagingDock />
          </div>
        </div>
      </FollowProvider>
    </ToastProvider>
  );
}
