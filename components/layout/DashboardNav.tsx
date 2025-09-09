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
  const [role, setRole] = useState<'athlete' | 'club' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) prova profilo
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const pt = (j?.data?.profile_type ?? '').toString().toLowerCase();
        if (pt.includes('atlet')) { setRole('athlete'); setLoaded(true); return; }
        if (pt.includes('club') || pt.includes('soc') || pt.includes('owner')) { setRole('club'); setLoaded(true); return; }

        // 2) fallback induttivo
        const rMine = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
        if (rMine.ok) {
          const jm = await rMine.json();
          if (Array.isArray(jm?.data) && jm.data.length > 0) { setRole('athlete'); setLoaded(true); return; }
        }

        const rRec = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
        if (rRec.ok) {
          const jr = await rRec.json();
          if (Array.isArray(jr?.data) && jr.data.length > 0) { setRole('club'); setLoaded(true); return; }
        }
      } catch (_) {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <nav className="flex gap-2 items-center p-3 border-b bg-white sticky top-0 z-10">
      <Link href="/clubs" className={btn(pathname.startsWith('/clubs'))}>Clubs</Link>
      <Link href="/opportunities" className={btn(pathname.startsWith('/opportunities'))}>Opportunità</Link>
      <Link href="/profile" className={btn(pathname.startsWith('/profile'))}>Profilo</Link>

      {/* Mostra esattamente uno dei due */}
      {loaded && role === 'athlete' && (
        <Link href="/applications" className={btn(pathname === '/applications')}>
          Candidature inviate
        </Link>
      )}
      {loaded && role === 'club' && (
        <Link href="/applications/received" className={btn(pathname === '/applications/received')}>
          Candidature ricevute
        </Link>
      )}
    </nav>
  );
}
