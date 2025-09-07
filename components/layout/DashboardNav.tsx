'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Me = { id: string; email?: string } | null;
type ProfileType = 'athlete' | 'club' | null;

export default function DashboardNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [meType, setMeType] = useState<ProfileType>(null);

  useEffect(() => {
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMe(j?.user ?? j ?? null))
      .catch(() => setMe(null));

    fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMeType(j?.data?.type ?? null))
      .catch(() => setMeType(null));
  }, []);

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg border ${
        pathname === href ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );

  async function signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <nav className="w-full flex items-center gap-2 p-3 border-b bg-white sticky top-0 z-10">
      {link('/clubs', 'Clubs')}
      {link('/opportunities', 'Opportunità')}
      {link('/profile', 'Profilo')}

      {/* Voci condizionate */}
      {meType === 'athlete' && link('/applications/sent', 'Candidature inviate')}
      {meType === 'club' && link('/applications', 'Candidature ricevute')}

      {/* auth a destra */}
      <div className="ml-auto flex items-center gap-2">
        {!me ? (
          <Link
            href="/login"
            className="px-3 py-2 rounded-lg bg-[#0a66c2] text-white hover:opacity-90"
          >
            Accedi
          </Link>
        ) : (
          <button
            onClick={signOut}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            Esci
          </button>
        )}
      </div>
    </nav>
  );
}
