'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

function pickData<T = any>(raw: any): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as any).data as T;
  return raw as T;
}

export default function ProfileHeader() {
  const [type, setType] = useState<AccountType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = pickData<any>(raw) || {};
        setType(j?.account_type ?? null);
      } catch {
        setType(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <header className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-gray-100" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-gray-100" />
      </header>
    );
  }

  const isClub = type === 'club';

  return (
    <header className="space-y-1">
      {/* Titolo richiesto: solo CLUB / ATLETA */}
      <h1 className="text-2xl font-bold tracking-tight">
        {isClub ? 'CLUB' : 'ATLETA'}
      </h1>
      <p className="text-sm text-gray-500">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
    </header>
  );
}
