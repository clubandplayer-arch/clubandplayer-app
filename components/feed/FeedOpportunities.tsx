'use client';

import { useEffect, useMemo, useState } from 'react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';

type ApiList<T> = { data?: T[]; [k: string]: any };

export default function FeedOpportunities() {
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);

  const [items, setItems] = useState<Opportunity[]>([]);
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // carica ruolo
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

  // carica opportunità
  useEffect(() => {
    let c = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const r = await fetch('/api/opportunities?sort=recent&pageSize=20', { credentials: 'include', cache: 'no-store' });
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
  }, []);

  // per ogni opportunità, verifica stato candidatura (idempotente)
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
    // limita a 20 per sicurezza
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
