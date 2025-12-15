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
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;

    (async () => {
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
            else if (t.includes('athlete') || t.includes('atlet')) setRole('athlete');
          }
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch('/api/applications', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({} as any));
          const data = Array.isArray(json?.data) ? json.data : [];
          const apiRole = String(json?.role || '').toLowerCase();

          const pending = data.filter((row: any) => {
            const s = (row?.status || '').toLowerCase();
            return !['accepted', 'rejected', 'withdrawn'].includes(s);
          }).length;

          if (!ignore) {
            setApplicationsCount(pending);
            if (!role) {
              if (apiRole.includes('club')) setRole('club');
              else if (apiRole.includes('athlete') || apiRole.includes('player')) setRole('athlete');
            }
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
            href="/applications"
            className={pill(isActive('/applications'))}
          >
            <span className="mr-1">💼</span>
            Candidature
            {applicationsCount > 0 && (
              <span className="ml-1 rounded-full bg-gray-900 px-1.5 text-[10px] text-white">
                {applicationsCount}
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
