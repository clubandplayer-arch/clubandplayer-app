// components/layout/DashboardNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Role = 'athlete' | 'club' | null;

function btn(active: boolean) {
  return [
    'px-3 py-2 rounded-lg border transition-colors',
    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50',
  ].join(' ');
}

function Badge({ n }: { n: number }) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 text-xs px-1.5 rounded-full bg-gray-900 text-white">
      {n}
    </span>
  );
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);
  const [countSent, setCountSent] = useState(0);
  const [countReceived, setCountReceived] = useState(0);

  // 1) Determina il ruolo
  useEffect(() => {
    (async () => {
      try {
        // Prova profilo server-side
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const pt = (j?.data?.profile_type ?? j?.data?.type ?? '').toString().toLowerCase();

        if (pt.includes('atlet')) {
          setRole('athlete');
          return;
        }
        if (pt.includes('club') || pt.includes('soc') || pt.includes('owner')) {
          setRole('club');
          return;
        }

        // Fallback induttivo
        const rMine = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
        if (rMine.ok) {
          const jm = await rMine.json().catch(() => ({}));
          if (Array.isArray(jm?.data) && jm.data.length > 0) {
            setRole('athlete');
            return;
          }
        }
        const rRec = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
        if (rRec.ok) {
          const jr = await rRec.json().catch(() => ({}));
          if (Array.isArray(jr?.data) && jr.data.length > 0) {
            setRole('club');
            return;
          }
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // 2) Carica i contatori in base al ruolo
  useEffect(() => {
    if (!loaded || !role) return;
    (async () => {
      try {
        if (role === 'athlete') {
          const r = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
          const j = await r.json().catch(() => ({}));
          setCountSent(Array.isArray(j?.data) ? j.data.length : 0);
        } else if (role === 'club') {
          const r = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
          const j = await r.json().catch(() => ({}));
          setCountReceived(Array.isArray(j?.data) ? j.data.length : 0);
        }
      } catch {
        // ignore
      }
    })();
  }, [loaded, role]);

  return (
    <nav className="flex gap-2 items-center p-3 border-b bg-white sticky top-0 z-10">
      <Link href="/clubs" className={btn(pathname.startsWith('/clubs'))}>Clubs</Link>
      <Link href="/opportunities" className={btn(pathname.startsWith('/opportunities'))}>Opportunità</Link>
      <Link href="/profile" className={btn(pathname.startsWith('/profile'))}>Profilo</Link>

      {/* CTA candidature: mostra una sola voce coerente col ruolo */}
      {loaded && role === 'athlete' && (
        <Link href="/applications" className={btn(pathname === '/applications')}>
          Candidature inviate <Badge n={countSent} />
        </Link>
      )}
      {loaded && role === 'club' && (
        <Link href="/applications" className={btn(pathname === '/applications')}>
          Candidature ricevute <Badge n={countReceived} />
        </Link>
      )}

      {/* Chip ruolo a destra */}
      <div className="ml-auto">
        {loaded && role && (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 border text-gray-700 uppercase">
            {role}
          </span>
        )}
      </div>
    </nav>
  );
}
