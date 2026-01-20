'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Search, UserPlus, Users } from 'lucide-react';
import useIsClub from '@/hooks/useIsClub';
import { ToastProvider } from '@/components/common/ToastProvider';
import { FollowProvider } from '@/components/follow/FollowProvider';
import { NavCloseIcon, NavMenuIcon } from '@/components/icons/NavToggleIcons';
import { MaterialIcon, type MaterialIconName } from '@/components/icons/MaterialIcon';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { useUnreadDirectThreads } from '@/hooks/useUnreadDirectThreads';
import { useNotificationsBadge } from '@/hooks/useNotificationsBadge';
import BrandLogo from '@/components/brand/BrandLogo';
import { buildProfileDisplayName } from '@/lib/displayName';
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay';

type Role = 'athlete' | 'club' | 'guest';

type NavItem = { label: string; href: string; icon: MaterialIconName };

type MobileMenuItem = {
  key: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  tone?: 'danger';
  badge?: number;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>('guest');
  const [_loadingRole, setLoadingRole] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState(true);
  const unreadDirectThreads = useUnreadDirectThreads();
  const { unreadCount: unreadNotifications, setUnreadCount: setUnreadNotifications } = useNotificationsBadge();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);

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
        setAvatarUrl(typeof profile?.avatar_url === 'string' ? profile.avatar_url : null);
        setProfileName(buildProfileDisplayName(profile?.full_name, profile?.display_name, 'Profilo'));

        if (j?.user?.id) {
          try {
            const profileRes = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
            const profileJson = await profileRes.json().catch(() => null);
            if (profileRes.ok && profileJson?.data) {
              const detailedProfile = profileJson.data;
              setAvatarUrl(typeof detailedProfile?.avatar_url === 'string' ? detailedProfile.avatar_url : null);
              setProfileName(
                buildProfileDisplayName(detailedProfile?.full_name, detailedProfile?.display_name, 'Profilo'),
              );
            }
          } catch {
            // ignora errori profilo dettagliato
          } finally {
            if (!cancelled) setAvatarLoading(false);
          }
        } else if (!cancelled) {
          setAvatarLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRole('guest');
          setAvatarLoading(false);
        }
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
    ],
    [applicationsHref],
  );

  const isActive = (href: string) => pathname === href || (!!pathname && pathname.startsWith(href + '/'));

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (profileMenuRef.current?.contains(target) || profileButtonRef.current?.contains(target)) {
        return;
      }
      setIsProfileMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isSearchOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOverlayOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOverlayOpen]);

  const profileInitials = useMemo(() => {
    const trimmed = profileName.trim();
    if (!trimmed) return 'CP';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
    return letters.join('') || 'CP';
  }, [profileName]);

  const mobileMenuItems = useMemo<MobileMenuItem[]>(() => {
    const items: MobileMenuItem[] = [];

    if (role !== 'guest') {
      const profileIcon = (
        <div className="relative h-6 w-6 overflow-hidden rounded-full border border-neutral-200 bg-slate-200">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Profilo" fill className="object-cover" sizes="24px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-700">
              {profileInitials}
            </div>
          )}
        </div>
      );

      items.push({ key: 'profile', label: 'Profilo', href: profileHref, icon: profileIcon });
      if (isClub) {
        items.push({ key: 'verification', label: 'Verifica profilo', href: '/club/verification' });
      }
      items.push({ key: 'logout', label: 'Logout', href: '/logout', icon: <LogOut size={16} aria-hidden />, tone: 'danger' });
    }

    if (role !== 'guest') {
      items.push({ key: 'following', label: 'Seguiti', href: '/following', icon: <Users size={16} aria-hidden /> });
      items.push({ key: 'who-to-follow', label: 'Chi seguire', href: '/who-to-follow', icon: <UserPlus size={16} aria-hidden /> });
    }
    if (isClub) {
      items.push({ key: 'roster', label: 'Rosa', href: '/club/roster', icon: <MaterialIcon name="following" fontSize={16} /> });
    }

    items.push(
      ...navItems.map((item) => ({
        key: item.href,
        label: item.label,
        href: item.href,
        icon:
          item.href === '/messages' ? (
            <MaterialIcon name={item.icon} fontSize={16} className="text-amber-600 hover:text-amber-700" />
          ) : (
            <MaterialIcon name={item.icon} fontSize={16} />
          ),
        badge:
          item.href === '/notifications'
            ? unreadNotifications
            : item.href === '/messages'
              ? unreadDirectThreads
              : undefined,
      })),
    );

    return items;
  }, [avatarUrl, isClub, navItems, profileHref, profileInitials, role, unreadDirectThreads, unreadNotifications]);

  return (
    <ToastProvider>
      <FollowProvider>
        <div className="min-h-screen bg-clubplayer-gradient">
          <header className="fixed inset-x-0 top-0 z-40 border-b bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4" style={{ ['--nav-h' as any]: '64px' }}>
              <div
                className="min-w-0 flex h-8 flex-shrink-0 items-center overflow-hidden md:h-10"
              >
                <BrandLogo variant="header" href="/feed" priority />
              </div>
              <form
                className="flex flex-1 min-w-0 items-center md:flex-none md:w-80"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = searchQuery.trim();
                  if (!trimmed) return;
                  router.push(`/search?q=${encodeURIComponent(trimmed)}&type=all`);
                }}
              >
                <div className="relative w-full min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => {
                      if (window.matchMedia('(min-width: 768px)').matches) return;
                      setIsSearchOverlayOpen(true);
                      searchInputRef.current?.blur();
                    }}
                    placeholder="Cerca club, player, opportunità, post, eventi…"
                    aria-label="Cerca"
                    className="h-10 w-full min-w-0 rounded-full border border-slate-200 bg-white/90 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
                  />
                </div>
              </form>

              <nav className="hidden flex-1 justify-center md:flex">
                <div className="flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm backdrop-blur">
                  {role !== 'guest' && (
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
                  )}
                  {isClub && (
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
                        <MaterialIcon
                          name={item.icon}
                          fontSize="small"
                          className={
                            item.href === '/messages' && !active ? 'text-amber-600 hover:text-amber-700' : undefined
                          }
                        />
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

              <div className="ml-auto flex h-full items-center gap-2">
                {role !== 'guest' && (
                  <div className="relative hidden md:block" ref={profileMenuRef}>
                    <button
                      type="button"
                      ref={profileButtonRef}
                      onClick={() => setIsProfileMenuOpen((v) => !v)}
                      aria-label="Apri menu profilo"
                      aria-haspopup="menu"
                      aria-expanded={isProfileMenuOpen}
                      aria-controls="profile-menu"
                      className="inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      style={{ width: 'calc(var(--nav-h) * 0.9)', height: 'calc(var(--nav-h) * 0.9)' }}
                    >
                      <div className="relative block h-full w-full aspect-square overflow-hidden rounded-full border border-neutral-200 flex-shrink-0 transition hover:ring-2 hover:ring-neutral-200">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt="Profilo" fill className="object-cover" sizes="58px" />
                        ) : avatarLoading ? (
                          <div className="h-full w-full bg-slate-200" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-semibold text-slate-700">
                            {profileInitials}
                          </div>
                        )}
                      </div>
                    </button>
                    {isProfileMenuOpen ? (
                      <div
                        id="profile-menu"
                        role="menu"
                        className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg"
                      >
                        {isClub && (
                          <Link
                            href="/opportunities/new"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                          >
                            Crea opportunità
                          </Link>
                        )}
                        <Link
                          href={profileHref}
                          role="menuitem"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        >
                          Modifica profilo
                        </Link>
                        {isClub && (
                          <Link
                            href="/club/verification"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                          >
                            Verifica profilo
                          </Link>
                        )}
                        <div className="my-1 h-px bg-slate-200" role="separator" />
                        <Link
                          href="/logout"
                          role="menuitem"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="block rounded-lg px-3 py-2 text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                        >
                          Logout
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 md:hidden"
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
                    {mobileMenuItems.map((item) => {
                      const active = isActive(item.href);
                      const toneClasses =
                        item.tone === 'danger'
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'hover:bg-neutral-50';
                      const activeClasses =
                        item.tone === 'danger'
                          ? toneClasses
                          : active
                            ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                            : toneClasses;

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex flex-1 min-w-[140px] items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${activeClasses}`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>

                </div>
              </div>
            ) : null}
          </header>
          <MobileSearchOverlay
            isOpen={isSearchOverlayOpen}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => setIsSearchOverlayOpen(false)}
            onSubmit={() => {
              const trimmed = searchQuery.trim();
              if (!trimmed) return;
              setIsSearchOverlayOpen(false);
              router.push(`/search?q=${encodeURIComponent(trimmed)}&type=all`);
            }}
          />

          <div className="flex min-h-screen flex-col pt-16">
            <main className="flex-1">{children}</main>

          </div>
        </div>
      </FollowProvider>
    </ToastProvider>
  );
}
