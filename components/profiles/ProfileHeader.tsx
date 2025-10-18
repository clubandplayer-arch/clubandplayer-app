// components/profiles/ProfileHeader.tsx
'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader() {
  const [role, setRole] = useState<AccountType>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json().catch(() => ({}));
        setRole(j?.data?.account_type ?? null);
      } catch {
        setRole(null);
      }
    })();
  }, []);

  const title =
    role === 'club'
      ? 'Il mio profilo club'
      : role === 'athlete'
      ? 'Il mio profilo atleta'
      : 'Il mio profilo';

  return (
    <h1 className="text-xl md:text-2xl font-semibold">{title}</h1>
  );
}
