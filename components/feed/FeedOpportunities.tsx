'use client';

import { useEffect, useMemo, useState } from 'react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';
import type { Interests } from '@/components/profiles/InterestsPanel';

type Role = 'athlete' | 'club' | 'guest';
type ApiList<T> = { data?: T[]; [k: string]: any };
const LS_KEY = 'cp_interests_v1';

export default function FeedOpportunities() {
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interests>({ sports: [] });

  const [items, setItems] = useState<Opportunity[]>([]);
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ruolo
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
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setInterests(JSON.parse(raw));
    } catch { /* noop */ }
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
        setInterests(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('sort', 'recent');
    p.set('pageSize', '20');
    // usa il primo sport selezionato come filtro principale (scelta semplice per Beta)
    if (interests.sports && interests.sports[0]) p.set('sport', interests.sports[0]);
    if (interests.country) p.set('country', interests.country);
    if (interests.region) p.set('region', interests.region!);
    if (interests.province) p.set('province', interests.province!);
    if (interests.city) p.set('city', interests.city!);
    return p.toString();
  }, [interests]);

  // carica opportunità filtrate
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

  if (loading) return <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">Caricamento feed…</div>;
  if (err) return <div className="bg-white rounded-xl border p-4 text-sm text-red-700 bg-red-50">Errore: {err}</div>;
  if (!items.length) return <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">Nessuna opportunità trovata.</div>;

  return (
    <div className="space-y-4">
      {items.map((opp) => (
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
