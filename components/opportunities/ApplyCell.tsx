'use client';

import { useEffect, useState } from 'react';
import ApplyButton from '@/components/opportunities/ApplyButton';

export default function ApplyCell({ opportunityId, ownerId }: { opportunityId: string; ownerId: string | null | undefined }) {
  const [loading, setLoading] = useState(true);
  const [isAthlete, setIsAthlete] = useState<boolean>(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [applied, setApplied] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // chi sono?
        const meR = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const meJ = await meR.json().catch(() => null);
        const uid = meJ?.id ?? null;
        if (!cancelled) setMeId(uid);

        // tipo profilo?
        const pr = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const pj = await pr.json().catch(() => ({}));
        const pt = (pj?.data?.profile_type ?? '').toString().toLowerCase();
        const athlete = pt.includes('atlet');
        if (!cancelled) setIsAthlete(!!athlete);

        // owner non può candidarsi alla propria opportunità
        if (uid && ownerId && uid === ownerId) { if (!cancelled) setApplied(true); return; }

        // se atleta, verifica se già candidato
        if (uid && athlete) {
          const r = await fetch(`/api/applications/mine?opportunityId=${encodeURIComponent(opportunityId)}`, {
            credentials: 'include',
            cache: 'no-store',
          });
          const j = await r.json().catch(() => ({}));
          const has = Array.isArray(j?.data) && j.data.length > 0;
          if (!cancelled) setApplied(!!has);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [opportunityId, ownerId]);

  async function onApply(note: string) {
    const r = await fetch('/api/applications', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, note }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error || `HTTP ${r.status}`); return; }
    setApplied(true);
  }

  // rendering
  if (loading) return <span className="text-gray-400">…</span>;

  // non atleti → pill informativa
  if (!isAthlete || !meId || (ownerId && meId === ownerId)) {
    return <span className="text-xs text-gray-500 border rounded px-2 py-1">Solo atleti</span>;
  }

  // già inviato → badge
  if (applied) {
    return <span className="text-xs text-green-700 bg-green-100 border border-green-200 rounded px-2 py-1">Candidatura inviata</span>;
  }

  // pulsante normale
  return <ApplyButton onApply={onApply} disabled={false} applied={false} />;
}
