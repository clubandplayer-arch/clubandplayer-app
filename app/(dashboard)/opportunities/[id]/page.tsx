'use client';

import { useEffect, useState } from 'react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [userRole, setUserRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        // whoami
        const rWho = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const jWho = await rWho.json().catch(() => ({}));
        if (cancelled) return;
        const raw = (jWho?.role ?? '').toString().toLowerCase();
        setUserRole(raw === 'club' || raw === 'athlete' ? (raw as Role) : 'guest');
        setMeId(jWho?.user?.id ?? null);
      } catch {
        if (!cancelled) {
          setUserRole('guest');
          setMeId(null);
        }
      }

      try {
        // dettaglio opportunità
        const rOpp = await fetch(`/api/opportunities/${id}`, { credentials: 'include', cache: 'no-store' });
        const txt = await rOpp.text();
        if (!rOpp.ok) {
          let msg = `HTTP ${rOpp.status}`;
          try { const j = JSON.parse(txt); msg = j.error || j.message || msg; } catch {}
          throw new Error(msg);
        }
        const j = txt ? JSON.parse(txt) : {};
        const data = j.data ?? j; // compat
        if (!cancelled) setOpp(data as Opportunity);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Errore caricamento annuncio');
      }

      try {
        // stato candidatura (idempotente)
        const rAp = await fetch(`/api/opportunities/${id}/apply`, { credentials: 'include', cache: 'no-store' });
        const t = await rAp.text();
        const j = t ? JSON.parse(t) : {};
        const applied =
          Boolean(j?.applied) ||
          Boolean(j?.alreadyApplied) ||
          Boolean(j?.data?.applied) ||
          Boolean(j?.data?.alreadyApplied) ||
          j?.status === 'applied';
        if (!cancelled) setHasApplied(applied);
      } catch {
        if (!cancelled) setHasApplied(false);
      }

      if (!cancelled) setLoading(false);
    }

    if (id) loadAll();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Caricamento annuncio…</div>;
  if (error) {
    return (
      <div className="p-6">
        <div className="border rounded-xl p-4 bg-red-50 text-red-700">
          Errore: {error}
        </div>
      </div>
    );
  }
  if (!opp) return <div className="p-6 text-sm text-gray-500">Annuncio non trovato.</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <OpportunityCard opp={opp} userRole={userRole} currentUserId={meId} hasApplied={hasApplied} />
      {/* later: colonna con info club, contatti, ecc. */}
    </div>
  );
}
