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

function Badge({ n }: { n: number }) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs bg-gray-900 text-white">
      {n}
    </span>
  );
}

type Role = 'athlete' | 'club' | null;

export default function DashboardNav() {
  const pathname = usePathname();

  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);
  const [sentCount, setSentCount] = useState<number>(0);        // atleta
  const [receivedCount, setReceivedCount] = useState<number>(0); // club

  useEffect(() => {
    (async () => {
      try {
        const rp = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const jp = await rp.json().catch(() => ({}));
        const pt = (jp?.data?.type ?? jp?.data?.profile_type ?? '').toString().toLowerCase();
        if (pt.includes('atlet')) setRole('athlete');
        else if (pt.includes('club')) setRole('club');

        if (!pt) {
          const rMine = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
          const jm = await rMine.json().catch(() => ({}));
          const mine = (jm?.data ?? jm?.items ?? jm ?? []) as any[];
          if (Array.isArray(mine) && mine.length > 0) setRole('athlete');

          const rRec = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
          const jr = await rRec.json().catch(() => ({}));
          const rec = (jr?.data ?? jr?.items ?? jr ?? []) as any[];
          if (Array.isArray(rec) && rec.length > 0) setRole((prev) => prev ?? 'club');
        }

        const fetchMine = async () => {
          const r = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
          const j = await r.json().catch(() => ({}));
          const list = (j?.data ?? j?.items ?? j ?? []) as any[];
          setSentCount(Array.isArray(list) ? list.length : 0);
        };
        const fetchRec = async () => {
          const r = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
          const j = await r.json().catch(() => ({}));
          const list = (j?.data ?? j?.items ?? j ?? []) as any[];
          setReceivedCount(Array.isArray(list) ? list.length : 0);
        };

        if (pt.includes('atlet')) await fetchMine();
        else if (pt.includes('club')) await fetchRec();
        else {
          await Promise.allSettled([fetchMine(), fetchRec()]);
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

      {loaded && role === 'athlete' && (
        <Link href="/applications/sent" className={btn(pathname === '/applications/sent')}>
          Candidature inviate
          <Badge n={sentCount} />
        </Link>
      )}

      {loaded && role === 'club' && (
        <>
          <Link href="/my/opportunities" className={btn(pathname === '/my/opportunities')}>
            I miei annunci
          </Link>
          <Link href="/applications" className={btn(pathname === '/applications')}>
            Candidature ricevute
            <Badge n={receivedCount} />
          </Link>
        </>
      )}
    </nav>
  );
}
