'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function cls(active: boolean) {
  return [
    'px-3 py-2 rounded-lg border',
    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50',
  ].join(' ');
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [profileType, setProfileType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json();
        setProfileType(j?.data?.profile_type ?? null);
      } catch {
        setProfileType(null);
      }
    })();
  }, []);

  const isAthlete =
    (profileType || '').toLowerCase().includes('atlet'); // “Atleta/athlete”

  return (
    <nav className="flex gap-2 items-center p-3 border-b bg-white sticky top-0 z-10">
      <Link href="/clubs" className={cls(pathname.startsWith('/clubs'))}>Clubs</Link>
      <Link href="/opportunities" className={cls(pathname.startsWith('/opportunities'))}>Opportunità</Link>
      <Link href="/profile" className={cls(pathname.startsWith('/profile'))}>Profilo</Link>

      {isAthlete ? (
        <Link href="/applications" className={cls(pathname === '/applications')}>Candidature</Link>
      ) : (
        <Link href="/applications/received" className={cls(pathname === '/applications/received')}>Candidature ricevute</Link>
      )}
    </nav>
  );
}
