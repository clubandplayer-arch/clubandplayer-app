'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
        if (!c) setOpp(o as Opportunity);
      } catch (e: any) {
        if (!c) setErr(e.message || 'Errore caricamento annuncio');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [id]);

  const isOwner = useMemo(
    () => !!meId && !!opp && opp.created_by === meId,
    [meId, opp]
  );
  const showApply = role === 'athlete' && !isOwner;

  if (loading) return <div className="p-4">Caricamento…</div>;
  if (err) return <div className="p-4 text-red-700 bg-red-50 border rounded-xl">{err}</div>;
  if (!opp) return <div className="p-4">Annuncio non trovato.</div>;

  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
  const created = opp.created_at ? new Date(opp.created_at).toLocaleString() : '—';
  const rawGender = (opp as any)?.gender as 'male' | 'female' | 'mixed' | undefined | null;
  const gender =
    rawGender === 'male' ? 'Maschile' :
    rawGender === 'female' ? 'Femminile' :
    rawGender === 'mixed' ? 'Misto' : undefined;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <Link href="/opportunities" className="text-sm text-gray-600 hover:underline">
          ← Torna agli annunci
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{opp.title}</h1>
            <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-2">
              <span>{opp.sport ?? '—'}</span>
              <span>•</span>
              <span>{opp.role ?? '—'}</span>
              <span>•</span>
              <span>Età: {fmtAge(opp.age_min as any, opp.age_max as any)}</span>
              {gender && (
                <>
                  <span>•</span>
                  <span>{gender}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showApply && (
              <ApplyCell opportunityId={opp.id} ownerId={opp.created_by ?? null} />
            )}
          </div>
        </header>

        <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
          {opp.description || '—'}
        </div>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">{opp.club_name ?? 'Club'}</span>
            {opp.created_by && (
              <FollowButton clubId={opp.created_by} clubName={opp.club_name ?? undefined} size="md" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {place && <span>{place}</span>}
            <span>•</span>
            <span>{created}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
