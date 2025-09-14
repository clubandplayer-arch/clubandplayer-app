'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import ApplyCTA from '@/components/opportunities/ApplyCTA';
import FollowButton from '@/components/clubs/FollowButton';
import type { Opportunity } from '@/types/opportunity';
import type { Gender } from '@/types/opportunity';

function formatBracket(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

function genderLabel(g?: Gender | null) {
  if (g === 'male') return 'Maschile';
  if (g === 'female') return 'Femminile';
  if (g === 'mixed') return 'Misto';
  return '—';
}

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // whoami
  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'club' || raw === 'athlete' ? (raw as Role) : 'guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // carica annuncio
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await fetch(`/api/opportunities/${id}`, { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        if (!r.ok) {
          let j: any = {};
          try {
            j = JSON.parse(t);
          } catch {
            /* noop */
          }
          throw new Error(j?.error || `HTTP ${r.status}`);
        }
        const j = t ? JSON.parse(t) : {};
        setOpp(j?.data ?? null);
      } catch (e: any) {
        setErr(e?.message || 'Errore caricamento opportunità');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const place = useMemo(
    () => (opp ? [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ') : ''),
    [opp]
  );

  if (loading) {
    return <div className="p-4 md:p-6"><div className="h-48 w-full rounded-2xl bg-gray-200 animate-pulse" /></div>;
  }

  if (err || !opp) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-xl border bg-red-50 text-red-700 p-4">
          {err || 'Annuncio non trovato'}
        </div>
        <div className="mt-4">
          <Link href="/opportunities" className="text-sm underline">← Torna alla lista</Link>
        </div>
      </div>
    );
  }

  const createdAt = opp.created_at ? new Date(opp.created_at).toLocaleString() : '';
  const ownerId = opp.created_by ?? opp.owner_id ?? null;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{opp.title}</h1>
        <ApplyCTA
          opportunityId={opp.id}
          ownerId={ownerId}
          userRole={role}
          currentUserId={meId}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        {opp.sport && <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">{opp.sport}</span>}
        {opp.role && <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">{opp.role}</span>}
        {opp.gender && <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">{genderLabel(opp.gender)}</span>}
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">Età: {formatBracket(opp.age_min, opp.age_max)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-medium">{opp.club_name ?? 'Club'}</span>
          {ownerId && <FollowButton clubId={ownerId} clubName={opp.club_name ?? undefined} />}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {place && <span>{place}</span>}
          {createdAt && <span>• {createdAt}</span>}
        </div>
      </div>

      {opp.description && (
        <section className="bg-white rounded-2xl border p-4 md:p-5 whitespace-pre-wrap">
          {opp.description}
        </section>
      )}

      <div>
        <Link href="/opportunities" className="text-sm underline">
          ← Torna alla lista
        </Link>
      </div>
    </div>
  );
}
