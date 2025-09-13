'use client';

import { useEffect, useMemo, useState } from 'react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';
import type { Interests } from '@/components/profiles/InterestsPanel';
import { LS_INTERESTS } from '@/components/profiles/InterestsPanel';
import { LS_FOLLOW_KEY } from '@/components/clubs/FollowButton';
import { LS_SHOW_ONLY_FOLLOWED } from '@/components/feed/FollowedClubs';

type Role = 'athlete' | 'club' | 'guest';
type ApiList<T> = { data?: T[]; [k: string]: any };

function safeWindow() {
  return typeof window !== 'undefined';
}

function readInterests(): Interests {
  if (!safeWindow()) return { sports: [] };
  try {
    const raw = localStorage.getItem(LS_INTERESTS);
    return raw ? JSON.parse(raw) : { sports: [] };
  } catch { return { sports: [] }; }
}

function readFollowed(): Record<string, { name?: string; followedAt: number }> {
  if (!safeWindow()) return {};
  try {
    const raw = localStorage.getItem(LS_FOLLOW_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function readOnlyFollowed(): boolean {
  if (!safeWindow()) return false;
  return localStorage.getItem(LS_SHOW_ONLY_FOLLOWED) === '1';
}

export default function FeedOpportunities() {
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interests>({ sports: [] });

  const [items, setItems] = useState<Opportunity[]>([]);
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, { name?: string; followedAt: number }>>({});
  const [onlyFollowed, setOnlyFollowed] = useState<boolean>(false);
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

  // interessi + seguiti + filtro “solo seguiti”
  useEffect(() => {
    setInterests(readInterests());
    setFollowed(readFollowed());
    setOnlyFollowed(readOnlyFollowed());

    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_INTERESTS) setInterests(readInterests());
      if (e.key === LS_FOLLOW_KEY) setFollowed(readFollowed());
      if (e.key === LS_SHOW_ONLY_FOLLOWED) setOnlyFollowed(readOnlyFollowed());
    };
    const onInterests = () => setInterests(readInterests());
    const onFollowed = () => setFollowed(readFollowed());
    const onOnly = () => setOnlyFollowed(readOnlyFollowed());

    window.addEventListener('storage', onStorage);
    window.addEventListener('cp:interests-changed', onInterests as any);
    window.addEventListener('cp:followed-clubs-changed', onFollowed as any);
    window.addEventListener('cp:followed-filter-changed', onOnly as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cp:interests-changed', onInterests as any);
      window.removeEventListener('cp:followed-clubs-changed', onFollowed as any);
      window.removeEventListener('cp:followed-filter-changed', onOnly as any);
    };
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

  const followedIds = useMemo(() => new Set(Object.keys(followed || {})), [followed]);

  // filtra se “solo seguiti”
  const filteredItems = useMemo(() => {
    if (!onlyFollowed) return items;
    if (followedIds.size === 0) return [];
    return items.filter(o => o.created_by && followedIds.has(o.created_by));
  }, [items, onlyFollowed, followedIds]);

  // ordina: seguiti in alto, poi gli altri (mantiene l'ordine relativo “recent”)
  const sortedItems = useMemo(() => {
    if (!filteredItems.length || followedIds.size === 0) return filteredItems;
    const withIdx = filteredItems.map((o, idx) => ({ o, idx }));
    withIdx.sort((a, b) => {
      const fa = a.o.created_by && followedIds.has(a.o.created_by) ? 1 : 0;
      const fb = b.o.created_by && followedIds.has(b.o.created_by) ? 1 : 0;
      return fb - fa || a.idx - b.idx;
    });
    return withIdx.map(x => x.o);
  }, [filteredItems, followedIds]);

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
