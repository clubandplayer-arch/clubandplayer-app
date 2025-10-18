'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader() {
  const [type, setType] = useState<AccountType>(null);

  // Leggo il tipo account
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

  // Nascondo con JS il titolo statico legacy ("Il mio profilo ...") e il paragrafo sotto
  useEffect(() => {
    try {
      const root: HTMLElement | null = document.querySelector('main') || document.body;
      if (!root) return;
      const firstH1 = root.querySelector('h1');
      if (!firstH1) return;
      const txt = (firstH1.textContent || '').toLowerCase();
      if (txt.includes('il mio profilo')) {
        (firstH1 as HTMLElement).style.display = 'none';
        const next = firstH1.nextElementSibling as HTMLElement | null;
        if (next && next.tagName.toLowerCase() === 'p') next.style.display = 'none';
      }
    } catch {}
  }, []);

  const label = type === 'club' ? 'CLUB' : 'ATLETA';

  return (
    <div className="mb-4">
      {/* fallback CSS se il DOM avesse proprio quell'albero */}
      <style jsx global>{`
        main > h1:first-of-type { display: none !important; }
        main > h1:first-of-type + p { display: none !important; }
      `}</style>

      <h1 className="text-2xl font-bold">{label}</h1>
      <p className="text-sm text-gray-500">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
    </div>
  );
}
