'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Opportunity } from '@/types/opportunity';

type Application = {
  id: string;
  opportunity_id?: string;
  status?: string;          // 'inviata' | 'in_review' | 'accettata' | 'rifiutata' | 'ritirata' | ...
  created_at?: string;
  opportunity?: Opportunity; // opzionale: denormalizzata dall'API
};

type ApiShape =
  | { data?: Application[] }
  | { applications?: Application[] }
  | Application[]
  | unknown;

const WITHDRAW_ALLOWED = new Set(['inviata', 'aperta', 'in_review', 'pending']);

function StatusChip({ status }: { status?: string }) {
  const s = (status || 'inviata').toLowerCase();
  const map: Record<string, string> = {
    inviata: 'bg-blue-100 text-blue-800',
    in_review: 'bg-amber-100 text-amber-800',
    accettata: 'bg-green-100 text-green-800',
    rifiutata: 'bg-red-100 text-red-800',
    ritirata: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
  };
  const cls = map[s] || 'bg-gray-100 text-gray-700';
  const label: Record<string, string> = {
    inviata: 'Inviata',
    in_review: 'In revisione',
    accettata: 'Accettata',
    rifiutata: 'Rifiutata',
    ritirata: 'Ritirata',
    pending: 'In revisione',
  };
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${cls}`}>{label[s] ?? s}</span>;
}

export default function MyApplications() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch('/api/applications/mine', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (r.status === 401) throw new Error('Devi effettuare l’accesso come atleta.');
        const j: ApiShape = await r.json().catch(() => ({}));
        const arr = Array.isArray(j) ? j : (j as any).data || (j as any).applications || [];
        if (!cancelled) setItems((arr as Application[]) ?? []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Errore di caricamento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasItems = useMemo(() => items && items.length > 0, [items]);

  async function handleWithdraw(appl: Application) {
    if (!appl?.id) return;
    const ok = confirm('Ritirare definitivamente questa candidatura?');
    if (!ok) return;

    // update ottimistico
    const prev = items;
    const next = prev.map(a => a.id === appl.id ? { ...a, status: 'ritirata' } : a);
    setItems(next);

    try {
      const res = await fetch(`/api/applications/${appl.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        // ripristina
        setItems(prev);
        const t = await res.text().catch(() => '');
        throw new Error(t || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Errore durante il ritiro della candidatura');
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (err) {
    return <div className="border rounded-xl p-4 bg-red-50 text-red-700">{err}</div>;
  }

  if (!hasItems) {
    return (
      <div className="rounded-xl border p-6 bg-white">
        <div className="text-lg font-semibold mb-1">Nessuna candidatura inviata</div>
        <div className="text-sm text-gray-600">
          Cerca nuove <Link href="/opportunities" className="underline">opportunità</Link> e candidati in un tap.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((appl) => {
        const opp = appl.opportunity;
        const oppId = opp?.id || appl.opportunity_id || '';
        const place = [opp?.city, opp?.province, opp?.region, opp?.country].filter(Boolean).join(', ');
        const canWithdraw = WITHDRAW_ALLOWED.has((appl.status || 'inviata').toLowerCase());

        return (
          <div key={appl.id} className="rounded-xl border p-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">{opp?.title ?? 'Annuncio'}</div>
                <div className="text-sm text-gray-700">
                  {opp?.club_name ?? 'Club'} {place ? `• ${place}` : ''}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  Stato: <StatusChip status={appl.status} />
                  {appl.created_at ? <>• inviata il {new Date(appl.created_at).toLocaleDateString('it-IT')}</> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {oppId ? (
                  <Link href={`/opportunities/${oppId}`} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
                    Apri annuncio
                  </Link>
                ) : null}
                {canWithdraw ? (
                  <button
                    onClick={() => handleWithdraw(appl)}
                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    Ritira candidatura
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
