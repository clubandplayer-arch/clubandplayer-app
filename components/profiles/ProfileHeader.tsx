// components/profiles/ProfileHeader.tsx
'use client';

import { useEffect, useState } from 'react';

type AccountType = 'club' | 'athlete' | null;

export default function ProfileHeader() {
  const [type, setType] = useState<AccountType>(null);

  // --- carica tipo account ---------------------------------------------------
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

  // --- utility per nascondere definitivamente un nodo ------------------------
  function hideEl(el: Element | null | undefined) {
    const e = el as HTMLElement | null;
    if (!e) return;
    e.setAttribute('aria-hidden', 'true');
    e.setAttribute('data-cp-legacy-hidden', '1');
    e.style.setProperty('display', 'none', 'important');
    e.style.setProperty('visibility', 'hidden', 'important');
    e.style.setProperty('pointer-events', 'none', 'important');
  }

  // --- nasconde vecchi titoli/paragrafi duplicati ----------------------------
  function hideLegacy() {
    try {
      const WRAP = document.getElementById('cp-dyn-profile-header');

      // 1) H1 che iniziano con "Il mio profilo ..."
      document.querySelectorAll('h1').forEach((el) => {
        if (WRAP && WRAP.contains(el)) return; // non toccare il nostro
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (/^il mio profilo\b/.test(txt)) {
          hideEl(el);

          // Nascondi fino a due fratelli <p> successivi che contengono la frase
          let sib: Element | null = el.nextElementSibling;
          for (let i = 0; i < 2 && sib; i++) {
            const isP = sib.tagName.toLowerCase() === 'p';
            const hasMsg = /aggiorna i tuoi dati per migliorare il matching/i.test(
              (sib.textContent || '').trim()
            );
            if (isP && hasMsg) hideEl(sib);
            sib = sib.nextElementSibling;
          }
        }
      });

      // 2) Paragrafi con la descrizione duplicata (in qualsiasi punto)
      document.querySelectorAll('p').forEach((p) => {
        if (WRAP && WRAP.contains(p)) return;
        if (/aggiorna i tuoi dati per migliorare il matching/i.test((p.textContent || '').trim())) {
          hideEl(p);
        }
      });
    } catch {
      /* noop */
    }
  }

  // esegui subito, dopo l’hydration e osserva cambi futuri
  useEffect(() => {
    // primo colpo subito
    hideLegacy();
    // dopo il paint/hydration
    requestAnimationFrame(() => hideLegacy());
    setTimeout(() => hideLegacy(), 60);
    setTimeout(() => hideLegacy(), 250);

    const mo = new MutationObserver(() => hideLegacy());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const label = type === 'club' ? 'CLUB' : 'ATLETA';
  const subtitle = 'Aggiorna i tuoi dati per migliorare il matching con club e opportunità.';

  return (
    <div id="cp-dyn-profile-header" className="mb-4">
      <h1 className="text-2xl font-bold">{label}</h1>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
