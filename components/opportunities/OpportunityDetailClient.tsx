'use client';

import { useEffect, useMemo, useState } from 'react';
import FollowButton from '@/components/clubs/FollowButton';
import ApplyCell from '@/components/opportunities/ApplyCell';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';
type ApiOne<T> = { data?: T; [k: string]: any };

function fmtAge(min?: number | null, max?: number | null) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

export default function OpportunityDetailClient({ id }: { id: string }) {
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // whoami
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (c) return;
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'athlete' || raw === 'club' ? raw : 'guest');
        setMeId(j?.user?.id ?? null);
      } catch {
        if (!c) { setRole('guest'); setMeId(null); }
      }
    })();
    return () => { c = true; };
  }, []);

  // load opportunity
  useEffect(() => {
    let c = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const r = await fetch(`/api/opportunities/${id}`, { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try { const j = JSON.parse(t); msg = j.error || j.message || msg; } catch {}
          throw new Error(msg);
        }
        const j: ApiOne<Opportunity> = t ? JSON.parse(t) : {};
        const o = (j.data ?? j) as any;
        if (!o?.id) throw new Error('Annuncio non trovato');

        const ownerId = o.owner_id ?? o.created_by ?? null; // compat
        if (!c) setOpp({ ...o, owner_id: ownerId, created_by: ownerId } as Opportunity);
      } catch (e: any) {
        if (!c) setErr(e.message || 'Errore caricamento annuncio');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [id]);

  const ownerId = opp?.owner_id ?? opp?.created_by ?? null;
  const isOwner = useMemo(() => !!meId && !!ownerId && meId === ownerId, [meId, ownerId]);
  const showCTA = role === 'athlete' && !isOwner;

  if (loading) return <div className="p-6">Caricamento…</div>;
  if (err || !opp) return <div className="p-6 text-red-600">Errore: {err || 'Dati non trovati'}</div>;

  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
  const genderLabel =
    (opp as any).gender === 'male' ? 'Maschile' :
    (opp as any).gender === 'female' ? 'Femminile' :
    (opp as any).gender === 'mixed' ? 'Misto' : undefined;
  const ageLabel = fmtAge(opp.age_min, opp.age_max);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{opp.title}</h1>
        {showCTA && (
          <ApplyCell opportunityId={opp.id} ownerId={ownerId} />
        )}
      </header>

      <div className="text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
        {opp.sport && <span>{opp.sport}</span>}
        {opp.role && <span>{opp.role}</span>}
        {genderLabel && <span>{genderLabel}</span>}
        {ageLabel && <span>Età: {ageLabel}</span>}
        {place && <span>📍 {place}</span>}
      </div>

      {!!ownerId && (
        <div className="text-sm">
          <FollowButton clubId={ownerId} clubName={opp.club_name ?? 'Club'} size="sm" />
        </div>
      )}

      {opp.description && <p className="text-gray-800">{opp.description}</p>}
    </div>
  );
}
