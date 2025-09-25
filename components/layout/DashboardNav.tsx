// components/layout/DashboardNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(' ');
}

function pill(active: boolean) {
  return cx(
    'px-3 py-2 rounded-lg border transition-colors',
    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50',
  );
}

type Role = 'athlete' | 'club' | null;

export default function DashboardNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [sentCount, setSentCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // 1) Rileva ruolo dal profilo
        const rProf = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const jp = await rProf.json().catch(() => ({}));
        const t = (jp?.data?.type ?? jp?.data?.profile_type ?? '').toString().toLowerCase();

        if (!ignore) {
          if (t.includes('club')) setRole('club');
          else if (t.includes('athlete') || t.includes('atlet')) setRole('athlete');
        }
      } catch {
        // ignora
      }

      try {
        // 2) Conta candidature inviate/ricevute
        const [rMine, rRec] = await Promise.allSettled([
          fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/applications/received', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (!ignore) {
          if (rMine.status === 'fulfilled') {
            const jm = await rMine.value.json().catch(() => ({}));
            const n = Array.isArray(jm?.data) ? jm.data.length : 0;
            setSentCount(n);
            if (role === null && n > 0) setRole('athlete'); // fallback
          }

          if (rRec.status === 'fulfilled') {
            const jr = await rRec.value.json().catch(() => ({}));
            const n2 = Array.isArray(jr?.data) ? jr.data.length : 0;
            setReceivedCount(n2);
            if (role === null && n2 > 0) setRole('club'); // fallback
          }
        }
      } finally {
        if (!ignore) setLoaded(true);
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAthlete = role === 'athlete';
  const applicationsHref = isAthlete ? '/applications/sent' : '/applications';
  const applicationsActive =
    pathname === applicationsHref ||
    (isAthlete ? pathname.startsWith('/applications/sent') : pathname === '/applications');

  return (
    <nav className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white p-3">
      <Link href="/clubs" className={pill(pathname.startsWith('/clubs'))}>
        Clubs
      </Link>

      <Link href="/opportunities" className={pill(pathname.startsWith('/opportunities'))}>
        Opportunità
      </Link>

      <Link href="/profile" className={pill(pathname.startsWith('/profile'))}>
        Profilo
      </Link>

      {loaded && (
        <Link href={applicationsHref} className={pill(applicationsActive)}>
          {isAthlete ? 'Candidature inviate' : 'Candidature ricevute'}
          <span className="ml-2 inline-flex h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-xs">
            {isAthlete ? sentCount : receivedCount}
          </span>
        </Link>
      )}
    </nav>
  );
}
