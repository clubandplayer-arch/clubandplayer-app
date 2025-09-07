'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Me = { id: string; email?: string };
type MeProfile = { type: 'athlete' | 'club' | null };

export default function DashboardNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [meType, setMeType] = useState<MeProfile['type']>(null);

  useEffect(() => {
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json()).then(setMe).catch(() => setMe(null));
    fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json()).then(j => setMeType(j?.data?.type ?? null)).catch(() => setMeType(null));
  }, []);

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg border ${
        pathname === href ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="w-full flex items-center gap-2 p-3 border-b bg-white sticky top-0 z-10">
      {link('/clubs', 'Clubs')}
      {link('/opportunities', 'Opportunità')}
      {link('/profile', 'Profilo')}
      {/* voce condizionata */}
      {meType === 'athlete' && link('/applications/sent', 'Candidature inviate')}
      {meType === 'club' && link('/applications', 'Candidature ricevute')}
    </nav>
  );
}
