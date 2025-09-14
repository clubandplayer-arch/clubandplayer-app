'use client';

import { useEffect, useMemo, useState } from 'react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';

export default function FeedOpportunities() {
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // mappa candidature già inviate { opportunity_id: true }
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({});

  // whoami -> ruolo + id
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = (j?.role ?? '').toString().toLowerCase();
        if (raw === 'club' || raw === 'athlete') setRole(raw as Role);
        else setRole('guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // fetch opportunità (semplice)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await fetch('/api/opportunities', { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        if (!r.ok) {
          try {
            const j = JSON.parse(t);
            throw new Error(j.error || `HTTP ${r.status}`);
          } catch {
            throw new Error(t || `HTTP ${r.status}`);
          }
        }
        const j = JSON.parse(t);
        if (cancelled) return;
        setItems(j?.data ?? []);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Errore caricamento feed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // se atleta -> carica candidature per popolare "già candidato"
  useEffect(() => {
    if (role !== 'athlete') return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/applications/mine', {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const m: Record<string, boolean> = {};
        for (const a of j?.data ?? []) {
          if (a?.opportunity_id) m[a.opportunity_id] = true;
        }
        setAppliedMap(m);
      } catch {
        /* best-effort: ignora errori */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (loading) return <div className="h-40 rounded-xl bg-gray-200 animate-pulse" />;
  if (err) {
    return (
      <div className="rounded-xl border p-4 bg-red-50 text-red-700">
        Errore: {err}{' '}
        <button
          className="ml-3 px-3 py-1 rounded-lg border bg-white hover:bg-gray-50"
          onClick={() => location.reload()}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!items.length) {
    return <div className="rounded-xl border p-4 bg-white">Nessuna opportunità trovata.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((opp) => (
        <OpportunityCard
          key={opp.id}
          opp={opp}
          userRole={role}
          currentUserId={meId}
          alreadyApplied={!!appliedMap[opp.id]}
          onApplied={(id) => setAppliedMap((m) => ({ ...m, [id]: true }))}
        />
      ))}
    </div>
  );
}
