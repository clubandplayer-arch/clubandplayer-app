'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Role = 'athlete' | 'club' | null;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}
function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/applications') return pathname === '/applications';
  if (href === '/applications/sent') return pathname === '/applications/sent';
  return pathname.startsWith(href);
}
function Btn({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        'px-3 py-2 rounded-lg border transition-colors',
        active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50'
      )}
    >
      {children}
    </Link>
  );
}
function Badge({ count }: { count: number }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center text-xs px-1.5 h-5 min-w-5 rounded-full bg-gray-900 text-white">
      {count}
    </span>
  );
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);

  // counter candidature
  const [countMine, setCountMine] = useState(0);   // atleta
  const [countRecv, setCountRecv] = useState(0);   // club

  useEffect(() => {
    (async () => {
      try {
        // 1) Profilo server-side
        const rProf = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const jp = await rProf.json().catch(() => ({}));
        const t =
          (jp?.data?.type ??
            jp?.data?.profile_type ??
            jp?.data?.account_type ??
            '')
            .toString()
            .toLowerCase();

        if (t.includes('athlet')) setRole('athlete');
        else if (t.includes('club') || t.includes('soc') || t.includes('owner')) setRole('club');

        // 2) Conta candidature inviate (atleta)
        try {
          const rMine = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
          if (rMine.ok) {
            const jm = await rMine.json().catch(() => ({}));
            const n = Array.isArray(jm?.data) ? jm.data.length : 0;
            setCountMine(n);
            if (n > 0 && !role) setRole('athlete');
          }
        } catch {}

        // 3) Conta candidature ricevute (club)
        try {
          const rRec = await fetch('/api/applications/received', { credentials: 'include', cache: 'no-store' });
          if (rRec.ok) {
            const jr = await rRec.json().catch(() => ({}));
            const n = Array.isArray(jr?.data) ? jr.data.length : 0;
            setCountRecv(n);
            if (n > 0 && !role) setRole('club');
          }
        } catch {}
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav className="flex gap-2 items-center p-3 border-b bg-white sticky top-0 z-10">
      <Btn href="/clubs" active={isActive(pathname, '/clubs')}>Clubs</Btn>
      <Btn href="/opportunities" active={isActive(pathname, '/opportunities')}>Opportunità</Btn>

      {/* Profilo sempre visibile */}
      <Btn href="/profile" active={isActive(pathname, '/profile')}>Profilo</Btn>

      {/* Se club: “Le mie opportunità” */}
      {loaded && role === 'club' && (
        <Btn href="/my/opportunities" active={isActive(pathname, '/my/opportunities')}>
          Le mie opportunità
        </Btn>
      )}

      {/* Un solo blocco candidature */}
      {loaded && role === 'athlete' && (
        <Btn href="/applications/sent" active={isActive(pathname, '/applications/sent')}>
          Candidature inviate <Badge count={countMine} />
        </Btn>
      )}
      {loaded && role === 'club' && (
        <Btn href="/applications" active={isActive(pathname, '/applications')}>
          Candidature ricevute <Badge count={countRecv} />
        </Btn>
      )}

      <div className="flex-1" />

      {/* Role chip */}
      <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
        {loaded ? (role === 'athlete' ? 'Athlete' : role === 'club' ? 'Club' : 'Guest') : '…'}
      </span>
    </nav>
  );
}
