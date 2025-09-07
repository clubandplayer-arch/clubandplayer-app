'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function btn(active: boolean) {
  return [
    'px-3 py-2 rounded-lg border transition-colors',
    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50',
  ].join(' ');
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [profileType, setProfileType] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        setProfileType((j?.data?.profile_type ?? null));
      } catch {
        setProfileType(null);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const norm = (profileType || '').toLowerCase();
  const isAthlete =
    norm.includes('atlet');            // “Atleta”, “Athlete”
  const isClub =
    norm.includes('club') || norm.includes('soc') || norm.includes('owner'); // “Club”, “Società”, “Owner”

  return (
    <nav className="flex gap-2 items-center p-3 border-b bg-white sticky top-0 z-10">
      <Link href="/clubs" className={btn(pathname.startsWith('/clubs'))}>Clubs</Link>
      <Link href="/opportunities" className={btn(pathname.startsWith('/opportunities'))}>Opportunità</Link>
      <Link href="/profile" className={btn(pathname.startsWith('/profile'))}>Profilo</Link>

      {/* mostra esattamente uno dei due; se il tipo non è ancora noto, non mostra niente */}
      {loaded && isAthlete && (
        <Link href="/applications" className={btn(pathname === '/applications')}>
          Candidature inviate
        </Link>
      )}
      {loaded && isClub && (
        <Link href="/applications/received" className={btn(pathname === '/applications/received')}>
          Candidature ricevute
        </Link>
      )}
    </nav>
  );
}
