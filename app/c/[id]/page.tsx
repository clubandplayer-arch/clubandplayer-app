'use client';

import { useEffect, useMemo, useState } from 'react';
import FollowButton from '@/components/clubs/FollowButton';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';
import { useFollowState } from '@/hooks/useFollowState';

type Club = {
  id: string;
  name: string;
  city?: string | null;
  region?: string | null;
  province?: string | null;
  country?: string | null;
  logo_url?: string | null;
  bio?: string | null;
};

export default function ClubPage({ params }: { params: { id: string } }) {
  const clubId = params.id;
  const [club, setClub] = useState<Club | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { following } = useFollowState();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const rClub = await fetch(`/api/clubs/${clubId}`, { credentials: 'include', cache: 'no-store' });
        const jClub = await rClub.json().catch(() => ({}));
        if (!rClub.ok) throw new Error(jClub?.error || `HTTP ${rClub.status}`);
        const c: Club = jClub?.data ?? jClub;
        if (!cancelled) setClub(c);

        // carica opportunità del club (fallback: filtra client)
        const rOpps = await fetch(`/api/opportunities?pageSize=50&owner=${clubId}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const t = await rOpps.text();
        let rows: Opportunity[] = [];
        if (t) {
          try {
            const j = JSON.parse(t);
            rows = (j?.data ?? j ?? []) as Opportunity[];
          } catch {
            rows = [];
          }
        }
        // fallback filtro client
        const onlyMine = rows.filter((o) => o.created_by === clubId);
        if (!cancelled) setOpps((onlyMine.length ? onlyMine : rows).slice(0, 10));
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Errore caricamento club');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const place = useMemo(() => {
    const p = [club?.city, club?.province, club?.region, club?.country].filter(Boolean).join(', ');
    return p || '—';
  }, [club]);

  if (loading) return <div className="p-4 md:p-6">Caricamento…</div>;
  if (err) return <div className="p-4 md:p-6 text-red-700 bg-red-50 border rounded-xl">{err}</div>;
  if (!club) return <div className="p-4 md:p-6">Club non trovato.</div>;
  const initialIsFollowing = following.has(club.id);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="bg-white rounded-xl border p-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
            {club.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{club.name}</h1>
            <div className="text-xs text-gray-600">{place}</div>
          </div>
        </div>
        <FollowButton
          targetId={club.id}
          targetType="club"
          targetName={club.name}
          size="md"
          initialIsFollowing={initialIsFollowing}
        />
      </header>

      {/* Bio */}
      {club.bio && (
        <section className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-2">Chi siamo</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{club.bio}</p>
        </section>
      )}

      {/* Ultime opportunità */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Ultime opportunità</h2>
        {opps.length === 0 ? (
          <div className="text-sm text-gray-500">Nessuna opportunità pubblicata.</div>
        ) : (
          opps.map((o) => <OpportunityCard key={o.id} opp={o} />)
        )}
      </section>
    </div>
  );
}
