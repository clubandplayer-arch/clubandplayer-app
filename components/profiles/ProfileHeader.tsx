'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader() {
  const [type, setType] = useState<AccountType>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
        setType((j?.account_type ?? null) as AccountType);
      } catch {
        setType(null);
      }
    })();
  }, []);

  const isClub = type === 'club';

  return (
    <>
      {/* Nasconde l'header statico legacy (il primo h1 della pagina) + il suo paragrafo subito sotto */}
      <style jsx global>{`
        main > h1:first-of-type { display: none !important; }
        main > h1:first-of-type + p { display: none !important; }
      `}</style>

      <h1 className="text-2xl font-bold">{isClub ? 'CLUB' : 'ATLETA'}</h1>
      <p className="text-sm text-gray-500">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
    </>
  );
}
