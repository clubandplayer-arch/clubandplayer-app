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
    active
      ? 'bg-gray-900 text-white border-gray-900'
      : 'bg-white hover:bg-gray-50'
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
      // 1) Ruolo dal profilo (compat: account_type / profile_type / type)
      try {
        const rProf = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (rProf.ok) {
          const jp = await rProf.json().catch(() => ({}));

          const raw =
            jp?.data?.account_type ??
            jp?.data?.profile_type ??
            jp?.data?.type ??
            '';

          const t = raw.toString().toLowerCase();

          if (!ignore) {
            if (t.includes('club')) setRole('club');
            else if (t.includes('athlete') || t.includes('atlet')) {
              setRole('athlete');
            }
          }
        }
      } catch {
        // ignora: resterà null finché non troviamo altro
      }

      // 2) Conteggio candidature inviate/ricevute (usato anche come fallback ruolo)
      try {
        const [rMine, rRec] = await Promise.allSettled([
          fetch('/api/applications/mine', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/applications/received', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (!ignore) {
          if (rMine.status === 'fulfilled' && rMine.value.ok) {
            const jm = await rMine.value.json().catch(() => ({}));
            const n = Array.isArray(jm?.data) ? jm.data.length : 0;
            setSentCount(n);
            if (role === null && n > 0) setRole('athlete');
          }

          if (rRec.status === 'fulfilled' && rRec.value.ok) {
            const jr = await rRec.value.json().catch(() => ({}));
            const n2 = Array.isArray(jr?.data) ? jr.data.length : 0;
            setReceivedCount(n2);
            if (role === null && n2 > 0) setRole('club');
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
  const isClub = role === 'club';

  const profileHref = isClub ? '/club/profile' : '/profile';

  const applicationsHref = isAthlete ? '/applications/sent' : '/applications';

  const applicationsActive =
    pathname === applicationsHref ||
    (isAthlete
      ? pathname.startsWith('/applications/sent')
      : pathname === '/applications');

  const applicationsLabel = isAthlete
    ? 'Candidature'
    : 'Candidature ricevute';

  const badgeCount = isAthlete ? sentCount : receivedCount;

  const profileActive = pathname.startsWith(profileHref);

  return (
    <nav className="flex gap-2 items-center p-3 border-b bg-white sticky top-0 z-10">
      <Link href="/feed" className="mr-2 text-lg font-semibold">
        Club&Player
      </Link>

      <Link
        href="/feed"
        className={pill(pathname === '/feed')}
      >
        Bacheca
      </Link>

      <Link
        href="/opportunities"
        className={pill(pathname.startsWith('/opportunities'))}
      >
        Opportunità
      </Link>

      {loaded && (
        <Link
          href={applicationsHref}
          className={pill(applicationsActive)}
        >
          <span className="inline-flex items-center gap-1">
            {applicationsLabel}
            {badgeCount > 0 && (
              <span className="inline-flex min-w-[18px] justify-center rounded-full bg-gray-900 text-white text-[10px] px-1.5">
                {badgeCount}
              </span>
            )}
          </span>
        </Link>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Link
          href={profileHref}
          className={pill(profileActive)}
        >
          Profilo
        </Link>
        <Link
          href="/logout"
          className={pill(pathname === '/logout')}
        >
          Logout
        </Link>
      </div>
    </nav>
  );
}
