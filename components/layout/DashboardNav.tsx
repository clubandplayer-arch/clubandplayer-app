'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Role = 'athlete' | 'club' | null;

function cx(
  ...cls: Array<string | false | null | undefined>
) {
  return cls.filter(Boolean).join(' ');
}

function pill(active: boolean) {
  return cx(
    'px-3 py-2 rounded-lg border text-xs md:text-sm transition-colors',
    active
      ? 'bg-gray-900 text-white border-gray-900'
      : 'bg-white text-gray-800 hover:bg-gray-50'
  );
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [sentCount, setSentCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;

    (async () => {
      // 1) Ruolo da /api/profiles/me
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (r.ok) {
          const j = await r.json().catch(() => ({} as any));
          const data = j?.data || j?.profile || null;
          const raw =
            data?.account_type ??
            data?.profile_type ??
            data?.type ??
            '';
          const t = String(raw).toLowerCase();
          if (!ignore) {
            if (t.includes('club')) setRole('club');
            else if (t.includes('athlete') || t.includes('atlet'))
              setRole('athlete');
          }
        }
      } catch {
        // ignore, fallback sotto
      }

      // 2) Fallback da applications
      try {
        const [mine, rec] = await Promise.allSettled([
          fetch('/api/applications', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/applications/received', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (
          mine.status === 'fulfilled' &&
          mine.value.ok
        ) {
          const jm = await mine.value
            .json()
            .catch(() => ({} as any));
          const n = Array.isArray(jm?.data)
            ? jm.data.length
            : 0;
          if (!ignore) {
            setSentCount(n);
            if (!role && n > 0) setRole('athlete');
          }
        }

        if (
          rec.status === 'fulfilled' &&
          rec.value.ok
        ) {
          const jr = await rec.value
            .json()
            .catch(() => ({} as any));
          const n = Array.isArray(jr?.data)
            ? jr.data.length
            : 0;
          if (!ignore) {
            setReceivedCount(n);
            if (!role && n > 0) setRole('club');
          }
        }
      } catch {
        // ignore
      }

      if (!ignore) setLoaded(true);
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/' && pathname.startsWith(href));

  const profileHref =
    role === 'club' ? '/club/profile' : '/player/profile';

  return (
    <nav className="w-full border-b bg-gray-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/feed" className={pill(isActive('/feed'))}>
            Bacheca
          </Link>
          <Link
            href="/opportunities"
            className={pill(isActive('/opportunities'))}
          >
            Opportunità
          </Link>
          <Link
            href={profileHref}
            className={pill(
              isActive('/player/profile') ||
                isActive('/club/profile')
            )}
          >
            Profilo
          </Link>
          <Link
            href="/applications/sent"
            className={pill(
              isActive('/applications/sent')
            )}
          >
            Candidature inviate
            {sentCount > 0 && (
              <span className="ml-1 rounded-full bg-gray-900 px-1.5 text-[10px] text-white">
                {sentCount}
              </span>
            )}
          </Link>
          <Link
            href="/applications"
            className={pill(isActive('/applications'))}
          >
            Candidature ricevute
            {receivedCount > 0 && (
              <span className="ml-1 rounded-full bg-gray-900 px-1.5 text-[10px] text-white">
                {receivedCount}
              </span>
            )}
          </Link>
        </div>

        <div className="hidden text-[10px] text-gray-500 md:block">
          {loaded
            ? role === 'club'
              ? 'Accesso CLUB'
              : role === 'athlete'
              ? 'Accesso ATLETA'
              : 'Utente non profilato'
            : 'Caricamento...'}
        </div>
      </div>
    </nav>
  );
}
