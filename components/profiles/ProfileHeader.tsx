// components/profiles/ProfileHeader.tsx
'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader({ expectedType }: { expectedType?: AccountType }) {
  const [type, setType] = useState<AccountType>(expectedType ?? null);

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

  // Nasconde header/descrizioni legacy e qualunque H1 "di troppo"
  function hideLegacy() {
    try {
      const WRAP = document.getElementById('cp-dyn-profile-header');

      document.querySelectorAll('h1').forEach((el) => {
        if (WRAP && WRAP.contains(el)) return; // non toccare il nostro
        const txt = (el.textContent || '').trim().toLowerCase();
        if (
          txt.startsWith('il mio profilo') ||
          txt === 'atleta' ||
          txt === 'club'
        ) {
          (el as HTMLElement).style.display = 'none';
          // se dopo c’è il paragrafo “Aggiorna i tuoi dati…”, nascondilo
          const sib = el.nextElementSibling as HTMLElement | null;
          if (
            sib &&
            sib.tagName.toLowerCase() === 'p' &&
            /aggiorna i tuoi dati per migliorare il matching/i.test(sib.textContent || '')
          ) {
            sib.style.display = 'none';
          }
        }
      });

      // nascondi ogni paragrafo duplicato con quel testo (ovunque) tranne dentro il nostro wrapper
      document.querySelectorAll('p').forEach((p) => {
        if (WRAP && WRAP.contains(p)) return;
        if (/aggiorna i tuoi dati per migliorare il matching/i.test(p.textContent || '')) {
          (p as HTMLElement).style.display = 'none';
        }
      });
    } catch {}
  }

  useEffect(() => {
    hideLegacy();
    const mo = new MutationObserver(() => hideLegacy());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const label = (type ?? expectedType) === 'club' ? 'CLUB' : 'PLAYER';

  // Niente descrizione (paragrafo) per evitare qualsiasi duplicazione visiva
  return (
    <div id="cp-dyn-profile-header" className="mb-4">
      <h1 className="heading-h1 text-3xl md:text-4xl">{label}</h1>
    </div>
  );
}
