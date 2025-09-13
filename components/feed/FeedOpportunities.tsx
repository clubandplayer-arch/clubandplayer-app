'use client';

import { useEffect, useMemo, useState } from 'react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';
import type { Interests } from '@/components/profiles/InterestsPanel';
import { LS_FOLLOW_KEY } from '@/components/clubs/FollowButton';

type Role = 'athlete' | 'club' | 'guest';
type ApiList<T> = { data?: T[]; [k: string]: any };
const LS_INTERESTS = 'cp_interests_v1';

function readFollowed(): Record<string, { name?: string; followedAt: number }> {
  try {
    const raw = localStorage.getItem(LS_FOLLOW_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export default function FeedOpportunities() {
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interests>({ sports: [] });

  const [items, setItems] = useState<Opportunity[]>([]);
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, { name?: string; followedAt: number }>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ruolo utente
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

  // interessi da localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_INTERESTS);
      if (raw) setInterests(JSON.parse(raw));
    } catch { /* noop */ }
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_INTERESTS && e.newValue) {
        setInterests(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // club seguiti
  useEffect(() => {
    setFollowed(readFollowed());
    const onFollow = () => setFollowed(readFollowed());
    window.addEventListener('cp:followed-clubs-changed', onFollow as any);
    return () => window.removeEventListener('cp:followed-clubs-changed', onFollow as any);
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('sort', 'recent');
    p.set('pageSize', '20');
    if (interests.sports && interests.sports[0]) p.set('sport', interests.sports[0]);
    if (interests.country) p.set('country', interests.country);
    if (interests.region) p.set('region', interests.region!);
    if (interests.province) p.set('province', interests.province!);
    if (interests.city) p.set('city', interests.city!);
    return p.toString();
  }, [interests]);

  // carica opportunità
  useEffect(() => {
    let c = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const r = await fetch(`/api/opportunities?${query}`, { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try { const j = JSON.parse(t); msg = j.error || j.message || msg; } catch {}
          throw new Error(msg);
        }
        const j: ApiList<Opportunity> = t ? JSON.parse(t) : {};
        const list = j.data ?? (Array.isArray(j) ? (j as any) : []);
        if (!c) setItems(list);
      } catch (e: any) {
        if (!c) setErr(e.message || 'Errore caricamento feed');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [query]);

  // stato candidatura
  useEffect(() => {
    let c = false;
    async function probe(id: string) {
      try {
        const r = await fetch(`/api/opportunities/${id}/apply`, { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        const j = t ? JSON.parse(t) : {};
        const applied =
          Boolean(j?.applied) ||
          Boolean(j?.alreadyApplied) ||
          Boolean(j?.data?.applied) ||
          Boolean(j?.data?.alreadyApplied) ||
          j?.status === 'applied';
        if (!c) setAppliedMap(prev => ({ ...prev, [id]: applied }));
      } catch {
        if (!c) setAppliedMap(prev => ({ ...prev, [id]: false }));
      }
    }
    setAppliedMap({});
    items.slice(0, 20).forEach(o => probe(o.id));
    return () => { c = true; };
  }, [items]);

  // ordina: club seguiti in alto (mantiene l'ordine relativo “recent”)
  const followedIds = useMemo(() => new Set(Object.keys(followed || {})), [followed]);
  const sortedItems = useMemo(() => {
    if (!items.length || followedIds.size === 0) return items;
    const withIdx = items.map((o, idx) => ({ o, idx }));
    withIdx.sort((a, b) => {
      const fa = a.o.created_by && followedIds.has(a.o.created_by) ? 1 : 0;
      const fb = b.o.created_by && followedIds.has(b.o.created_by) ? 1 : 0;
      // prima seguiti, poi gli altri; a parità, mantieni ordine originale (recent)
      return fb - fa || a.idx - b.idx;
    });
    return withIdx.map(x => x.o);
  }, [items, followedIds]);

  if (loading) return <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">Caricamento feed…</div>;
  if (err) return <div className="bg-white rounded-xl border p-4 text-sm text-red-700 bg-red-50">Errore: {err}</div>;
  if (!sortedItems.length) return <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">Nessuna opportunità trovata.</div>;

  return (
    <div className="space-y-4">
      {sortedItems.map((opp) => (
        <OpportunityCard
          key={opp.id}
          opp={opp as any}
          userRole={role}
          currentUserId={meId}
          hasApplied={appliedMap[opp.id]}
        />
      ))}
    </div>
  );
}
