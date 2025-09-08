'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Me = { id: string; email?: string } | null;
type Role = 'athlete' | 'club' | null;

export default function DashboardNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [uRes, pRes] = await Promise.all([
          fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' }),
        ]);

        const u = uRes.ok ? await uRes.json() : null;
        const p = pRes.ok ? await pRes.json() : null;

        if (!cancelled) {
          setMe(u ?? null);
          setRole(p?.data?.type ?? null);
        }
      } catch {
        if (!cancelled) {
          setMe(null);
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const isActive = (href: string) => (pathname === href ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50');

  const doSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/';
  };

  return (
    <nav className="w-full sticky top-0 z-10 border-b bg-white">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2">
        <Link href="/opportunities" className={`px-3 py-2 rounded-lg border ${isActive('/opportunities')}`}>
          Opportunità
        </Link>
        <Link href="/clubs" className={`px-3 py-2 rounded-lg border ${isActive('/clubs')}`}>
          Clubs
        </Link>
        <Link href="/profile" className={`px-3 py-2 rounded-lg border ${isActive('/profile')}`}>
          Profilo
        </Link>

        {/* voci condizionali */}
        {!loading && role === 'athlete' && (
          <Link href="/applications/sent" className={`ml-1 px-3 py-2 rounded-lg border ${isActive('/applications/sent')}`}>
            Candidature inviate
          </Link>
        )}
        {!loading && role === 'club' && (
          <Link href="/applications" className={`ml-1 px-3 py-2 rounded-lg border ${isActive('/applications')}`}>
            Candidature ricevute
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2">
          {me?.email && (
            <span className="hidden md:inline text-sm text-gray-600 mr-1">
              {me.email}
            </span>
          )}
          {me ? (
            <button onClick={doSignOut} className="btn btn-outline">
              Esci
            </button>
          ) : (
            <Link href="/auth/login" className="btn btn-brand">
              Accedi
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
