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

type Role = 'athlete' | 'club' | null;

export default function DashboardNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) Prova dal profilo (gestiamo più shape)
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const profileType = (
          j?.data?.profile_type ??
          j?.data?.type ??
          j?.type ??
          j?.profile?.type ??
          ''
        )
          .toString()
          .toLowerCase();

        if (profileType.includes('atlet')) { setRole('athlete'); setLoaded(true); return; }
        if (profileType.includes('club') || profileType.includes('soc') || profileType.includes('owner')) {
          setRole('club'); setLoaded(true); return;
        }

        // 2) Fallback induttivo: guarda le candidature inviate
        const rMine = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
        if (rMine.ok) {
          const jm = await rMine.json().catch(() => ({}));
          const mine =
            (Array.isArray(jm) && jm) ||
            (Array.isArray(jm?.items) && jm.items) ||
            (Array.isArray(jm?.data) && jm.data) ||
            [];
          if (mine.length > 0) { setRole('athlete'); setLoaded(true); return; }
        }

        // 3) Fallback induttivo: guarda le candidature ricevute
        const rRec = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
        if (rRec.ok) {
          const jr = await rRec.json().catch(() => ({}));
          const rec =
            (Array.isArray(jr) && jr) ||
            (Array.isArray(jr?.items) && jr.items) ||
            (Array.isArray(jr?.data) && jr.data) ||
            [];
          if (rec.length > 0) { setRole('club'); setLoaded(true); return; }
        }
      } catch {
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
        <Link href="/applications/sent" className={btn(pathname.startsWith('/applications/sent'))}>
          Candidature inviate
        </Link>
      )}
      {loaded && role === 'club' && (
        <Link href="/applications" className={btn(pathname === '/applications')}>
          Candidature ricevute
        </Link>
      )}
    </nav>
  );
}
