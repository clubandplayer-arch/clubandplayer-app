'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Role = 'athlete' | 'club' | 'guest';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [role, setRole] = useState<Role>('guest');
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // fonte principale
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const raw = (j?.role ?? '').toString().toLowerCase();
        if (raw === 'club' || raw === 'athlete') {
          setRole(raw as Role);
        } else {
          setRole('guest');
        }
      } catch {
        if (!cancelled) setRole('guest');
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const profileHref = role === 'club' ? '/club/profile' : '/profile';

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && (pathname?.startsWith(href) ?? false));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <Link href="/feed" className="font-semibold">
            Club&Player
          </Link>

          {/* Nav principale */}
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/feed"
              className={`px-3 py-1.5 rounded-md hover:bg-gray-100 ${isActive('/feed') ? 'bg-gray-100 font-medium' : ''}`}
            >
              Bacheca
            </Link>
            <Link
              href="/opportunities"
              className={`px-3 py-1.5 rounded-md hover:bg-gray-100 ${isActive('/opportunities') ? 'bg-gray-100 font-medium' : ''}`}
            >
              Opportunità
            </Link>
            <Link
              href="/clubs"
              className={`px-3 py-1.5 rounded-md hover:bg-gray-100 ${isActive('/clubs') ? 'bg-gray-100 font-medium' : ''}`}
            >
              Club
            </Link>
            {role === 'club' && (
              <Link
                href="/club/applicants"
                className={`px-3 py-1.5 rounded-md hover:bg-gray-100 ${isActive('/club/applicants') ? 'bg-gray-100 font-medium' : ''}`}
              >
                Candidature
              </Link>
            )}
            {role === 'athlete' && (
              <Link
                href="/applications/received"
                className={`px-3 py-1.5 rounded-md hover:bg-gray-100 ${isActive('/applications') ? 'bg-gray-100 font-medium' : ''}`}
              >
                Le mie candidature
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* CTA “Nuova opportunità” — sempre visibile ai club */}
            {role === 'club' && (
              <Link
                href="/opportunities/new"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                + Nuova opportunità
              </Link>
            )}

            {/* Profilo (dinamico) */}
            {!loadingRole && (
              <Link
                href={profileHref}
                className={`rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 ${isActive(profileHref) ? 'bg-gray-50' : ''}`}
              >
                Profilo
              </Link>
            )}

            {/* Logout */}
            <Link
              href="/logout"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Logout
            </Link>
          </div>
        </div>
      </header>

      {/* Contenuto */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
