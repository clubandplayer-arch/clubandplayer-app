'use client';

import { useEffect, useState } from 'react';
import ApplyCTA from '@/components/opportunities/ApplyCTA';
import type { Opportunity } from '@/types/opportunity';
import { opportunityGenderLabel } from '@/lib/opps/gender';

// NEW: analytics
import TrackOpportunityOpen from '@/components/analytics/TrackOpportunityOpen';
import { track } from '@/lib/analytics';

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Chi sono?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'athlete' || raw === 'club' ? (raw as Role) : 'guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Dati opportunità
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const r = await fetch(`/api/opportunities/${id}`, { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        if (!r.ok) {
          try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${r.status}`); }
          catch { throw new Error(t || `HTTP ${r.status}`); }
        }
        const j = JSON.parse(t);
        if (!cancelled) {
          const raw = j?.data ?? j;
          const ownerId = raw?.owner_id ?? raw?.created_by ?? null;
          setOpp(raw ? { ...raw, owner_id: ownerId, created_by: ownerId } : null);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Errore caricamento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Ho già candidato?
  useEffect(() => {
    if (role !== 'athlete') return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/applications/mine', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!cancelled) {
          const has = !!(j?.data ?? []).find((a: any) => a?.opportunity_id === id);
          setAlreadyApplied(has);
        }
      } catch {
        /* noop */
      }
    })();
    return () => { cancelled = true; };
  }, [role, id]);

  if (loading) return <div className="p-6">Caricamento…</div>;
  if (err || !opp) return <div className="p-6 text-red-600">Errore: {err || 'Dati non trovati'}</div>;

  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
  const genderLabel = opportunityGenderLabel((opp as any).gender) ?? undefined;
  const ageLabel =
    opp.age_min != null && opp.age_max != null ? `${opp.age_min}-${opp.age_max}` :
    opp.age_min != null ? `${opp.age_min}+` :
    opp.age_max != null ? `≤${opp.age_max}` : undefined;

  const ownerId = opp.owner_id ?? opp.created_by ?? null;
  const isOwner = !!meId && !!ownerId && ownerId === meId;
  const showCTA = role === 'athlete' && !isOwner;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* NEW: traccia apertura dettaglio */}
      <TrackOpportunityOpen id={id} />

      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{opp.title}</h1>
        {showCTA && (
          <ApplyCTA
            oppId={opp.id}
            initialApplied={alreadyApplied}
            onApplied={() => {
              setAlreadyApplied(true);
              track('application_submit', { opportunity_id: opp.id, role });
            }}
          />
        )}
      </header>

      <div className="text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
        {opp.sport && <span>{opp.sport}</span>}
        {opp.role && <span>{opp.role}</span>}
        {genderLabel && <span>{genderLabel}</span>}
        {ageLabel && <span>Età: {ageLabel}</span>}
        {place && <span>📍 {place}</span>}
      </div>

      {opp.description && <p className="text-gray-800">{opp.description}</p>}
    </div>
  );
}
