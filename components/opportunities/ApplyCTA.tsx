'use client';

import { useEffect, useState } from 'react';

export default function ApplyCTA({
  opportunityId,
  ownerId,
  userRole = 'guest',
  currentUserId,
}: {
  opportunityId: string;
  ownerId?: string | null;
  userRole?: 'athlete' | 'club' | 'guest';
  currentUserId?: string | null;
}) {
  const isOwner = ownerId && currentUserId && ownerId === currentUserId;
  const canApply = userRole === 'athlete' && !isOwner;

  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Best-effort: verifica se ho già candidato leggendo le “sent”
  useEffect(() => {
    let cancelled = false;
    if (!currentUserId) return;
    (async () => {
      try {
        const r = await fetch('/api/applications/sent', {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json().catch(() => ({}));
        const list = (j?.data ?? []) as Array<{ opportunity_id?: string }>;
        const found = !!list.find((a) => a.opportunity_id === opportunityId);
        if (!cancelled) setApplied(found);
      } catch {
        /* silenzio: non bloccare la pagina */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, opportunityId]);

  async function handleApply() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/apply2`, {
        method: 'POST',
        credentials: 'include',
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        /* noop */
      }
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      // /apply2 è idempotente: in ogni caso consideriamo “applied”
      setApplied(true);
    } catch (e: any) {
      setErr(e?.message || 'Errore durante la candidatura');
    } finally {
      setLoading(false);
    }
  }

  if (isOwner) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm">
        Sei il proprietario
      </span>
    );
  }

  if (!canApply) {
    return (
      <span className="inline-flex items-center rounded-lg border px-3 py-2 text-sm">
        Dettaglio
      </span>
    );
  }

  if (applied) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-3 py-1 text-sm">
        Già candidato
      </span>
    );
  }

  return (
    <button
      onClick={handleApply}
      disabled={loading}
      className="inline-flex items-center rounded-lg bg-gray-900 text-white px-3 py-2 text-sm disabled:opacity-60"
    >
      {loading ? 'Invio…' : 'Candidati'}
      {err && <span className="ml-2 text-red-200">({err})</span>}
    </button>
  );
}
