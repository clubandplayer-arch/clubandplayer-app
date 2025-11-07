'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Opportunity = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
};

type WhoAmI = {
  user: { id: string; email?: string } | null;
  role: 'guest' | 'club' | 'athlete';
};

export default function OpportunityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [me, setMe] = useState<WhoAmI | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [oppRes, meRes] = await Promise.all([
          fetch(`/api/opportunities/${id}`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/auth/whoami', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        const oppJson = await oppRes.json().catch(() => ({}));
        const meJson = await meRes.json().catch(() => ({}));

        if (!oppRes.ok) {
          throw new Error(oppJson.error || `HTTP ${oppRes.status}`);
        }

        if (cancelled) return;

        setOpp(oppJson.data || null);
        setMe({
          user: meJson?.user ?? null,
          role:
            meJson?.role === 'club' || meJson?.role === 'athlete'
              ? meJson.role
              : 'guest',
        });
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'Errore nel caricamento');
          setOpp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner = (() => {
    if (!opp || !me?.user?.id) return false;
    const ownerId = (opp as any).owner_id ?? opp.created_by ?? null;
    return !!ownerId && ownerId === me.user.id;
  })();

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Caricamento opportunità…
      </div>
    );
  }

  if (err || !opp) {
    return (
      <div className="p-4 text-sm text-red-600">
        {err || 'Opportunità non trovata.'}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {opp.title || 'Opportunità'}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            ID: {opp.id}
            {opp.created_at && (
              <>
                {' '}
                · pubblicata il{' '}
                {new Date(opp.created_at).toLocaleDateString('it-IT')}
              </>
            )}
          </p>
        </div>

        {isOwner && (
          <Link
            href={`/opportunities/new?edit=${opp.id}`}
            className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            Modifica
          </Link>
        )}
      </div>

      {opp.description && (
        <div className="whitespace-pre-wrap rounded-md border bg-white p-3 text-sm text-gray-800">
          {opp.description}
        </div>
      )}
    </div>
  );
}
