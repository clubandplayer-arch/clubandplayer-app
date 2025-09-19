'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Role = 'athlete' | 'club' | 'guest';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);

  // chi sono
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { cache: 'no-store', credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = String(j?.role ?? '').toLowerCase();
        if (raw === 'club' || raw === 'athlete') setRole(raw as Role);
        else setRole('guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const profileHref = useMemo(() => {
    if (role === 'club') return '/club/profile';
    if (role === 'athlete') return '/profile';
    return '/login';
  }, [role]);

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active =
      pathname === href ||
      (href !== '/' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`px-2 py-1.5 rounded-md text-sm ${
          active ? 'text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {label}
      </Link>
    );
  };

  const doLogout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' }).catch(()=>{});
    } finally {
      // hard redirect per sicurezza
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navbar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl h-14 px-4 flex items-center gap-4">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-600" />
            <span className="font-semibold">Club&Player</span>
          </Link>

          <nav className="hidden md:flex items-center gap-2 ml-4">
            <NavLink href="/feed" label="Feed" />
            <NavLink href="/opportunities" label="Opportunità" />
            <NavLink href="/clubs" label="Club" />
            <NavLink href={profileHref} label="Profilo" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <input
              placeholder="Cerca"
              className="hidden md:block w-64 rounded-lg border px-3 py-1.5"
            />
            {role === 'club' && (
              <Link
                href="/opportunities?new=1"
                className="rounded-lg bg-blue-600 text-white px-3 py-1.5"
              >
                + Nuova opportunità
              </Link>
            )}

            {(role === 'club' || role === 'athlete') ? (
              <button
                onClick={doLogout}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
