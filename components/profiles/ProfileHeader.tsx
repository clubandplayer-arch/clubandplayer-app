'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader() {
  const [type, setType] = useState<AccountType>(null);

  // carica il tipo di account
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

  // funzione che nasconde i titoli/paragrafi legacy ovunque nella pagina
  function hideLegacy() {
    try {
      const WRAP = document.getElementById('cp-dyn-profile-header');

      // nascondi qualunque H1 che inizia con "Il mio profilo ..."
      document.querySelectorAll('h1').forEach((el) => {
        if (WRAP && WRAP.contains(el)) return; // non toccare il nostro header
        const txt = (el.textContent || '').trim().toLowerCase();
        if (txt.startsWith('il mio profilo')) {
          (el as HTMLElement).style.display = 'none';

          // prova a nascondere anche il paragrafo di descrizione che segue
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

      // fallback: se c'è un paragrafo duplicato della descrizione, nascondilo
      document.querySelectorAll('p').forEach((p) => {
        if (WRAP && WRAP.contains(p)) return;
        if (/aggiorna i tuoi dati per migliorare il matching/i.test(p.textContent || '')) {
          (p as HTMLElement).style.display = 'none';
        }
      });
    } catch {}
  }

  // esegui subito e poi osserva il DOM per eventuali inserimenti successivi
  useEffect(() => {
    hideLegacy();
    const mo = new MutationObserver(() => hideLegacy());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
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
