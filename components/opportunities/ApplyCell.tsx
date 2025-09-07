'use client';

import { useEffect, useState } from 'react';
import ApplyButton from '@/components/opportunities/ApplyButton';

export default function ApplyCell({
  opportunityId,
  ownerId,
}: {
  opportunityId: string;
  ownerId: string | null | undefined;
}) {
  const [loading, setLoading] = useState(true);
  const [isAthlete, setIsAthlete] = useState<boolean>(true); // fallback ottimistico
  const [meId, setMeId] = useState<string | null>(null);
  const [applied, setApplied] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // 1) whoami -> uid (se fallisce non blocchiamo il bottone)
        try {
          const meR = await fetch('/api/auth/whoami', {
            credentials: 'include',
            cache: 'no-store',
          });
          const meJ = await meR.json().catch(() => null);
          if (!cancelled) setMeId(meJ?.id ?? null);
        } catch {
          if (!cancelled) setMeId(null);
        }

        // 2) profilo -> tipo (se non c'è, restiamo "athlete" per default)
        try {
          const pr = await fetch('/api/profiles/me', {
            credentials: 'include',
            cache: 'no-store',
          });
          const pj = await pr.json().catch(() => ({}));
          const pt = (pj?.data?.profile_type ?? '').toString().toLowerCase();
          if (pt.includes('club') || pt.includes('soc') || pt.includes('owner')) {
            if (!cancelled) setIsAthlete(false);
          } else if (pt.includes('atlet')) {
            if (!cancelled) setIsAthlete(true);
          }
          // se pt è vuoto: lasciamo il fallback ottimistico (true)
        } catch {
          // ignora -> fallback ottimistico (true)
        }

        // 3) se (atleta) prova a capire se ha già applicato
        //    (se la chiamata fallisce non blocchiamo il bottone)
        try {
          const r = await fetch(
            `/api/applications/mine?opportunityId=${encodeURIComponent(opportunityId)}`,
            { credentials: 'include', cache: 'no-store' }
          );
          if (r.ok) {
            const j = await r.json().catch(() => ({}));
            const has = Array.isArray(j?.data) && j.data.length > 0;
            if (!cancelled) setApplied(!!has);
          }
        } catch {
          // ignora
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, ownerId]);

  async function onApply(note: string) {
    const r = await fetch('/api/applications', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, note }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error || `HTTP ${r.status}`);
      return;
    }
    setApplied(true);
  }

  // ---- rendering ----
  if (loading) return <span className="text-gray-400">…</span>;

  // se NON atleta => blocco
  if (!isAthlete) {
    return (
      <span className="text-xs text-gray-500 border rounded px-2 py-1">Solo atleti</span>
    );
  }

  // se possiamo verificare owner e coincide, blocco (un club non può candidarsi alla propria opportunità)
  if (meId && ownerId && meId === ownerId) {
    return (
      <span className="text-xs text-gray-500 border rounded px-2 py-1">Solo atleti</span>
    );
  }

  // se già inviato => badge
  if (applied) {
    return (
      <span className="text-xs text-green-700 bg-green-100 border border-green-200 rounded px-2 py-1">
        Candidatura inviata
      </span>
    );
  }

  // altrimenti bottone + nota
  return <ApplyButton onApply={onApply} disabled={false} applied={false} />;
}
