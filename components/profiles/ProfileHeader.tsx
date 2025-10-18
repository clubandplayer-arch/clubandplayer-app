'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader() {
  const [type, setType] = useState<AccountType>(null);

  // leggo il tipo account
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

  // Nascondi qualunque titolo/paragrafo legacy NON dentro al nostro header
  useEffect(() => {
    try {
      const OUR_WRAP_SELECTOR = '#cp-dyn-profile-header';

      // nascondi <h1> "Il mio profilo …"
      const h1s = Array.from(document.querySelectorAll('h1'));
      h1s
        .filter(
          (el) =>
            !el.closest(OUR_WRAP_SELECTOR) &&
            /il mio profilo\s+/i.test(el.textContent || '')
        )
        .forEach((el) => {
          (el as HTMLElement).style.display = 'none';
          // prova a nascondere anche il paragrafo subito dopo, se è quello descrittivo
          const sib = el.nextElementSibling as HTMLElement | null;
          if (
            sib &&
            sib.tagName.toLowerCase() === 'p' &&
            /aggiorna i tuoi dati per migliorare il matching/i.test(sib.textContent || '')
          ) {
            sib.style.display = 'none';
          }
        });

      // fallback: se c'è un paragrafo descrittivo duplicato fuori dal nostro wrapper, nascondilo
      const ps = Array.from(document.querySelectorAll('p'));
      ps
        .filter(
          (el) =>
            !el.closest(OUR_WRAP_SELECTOR) &&
            /aggiorna i tuoi dati per migliorare il matching/i.test(el.textContent || '')
        )
        .forEach((el) => ((el as HTMLElement).style.display = 'none'));
    } catch {}
  }, []);

  const label = type === 'club' ? 'CLUB' : 'ATLETA';

  return (
    <div id="cp-dyn-profile-header" className="mb-4">
      <h1 className="text-2xl font-bold">{label}</h1>
      <p className="text-sm text-gray-500">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
    </div>
  );
}
