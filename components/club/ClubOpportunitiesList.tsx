'use client';

import { useEffect, useState } from 'react';
import OpportunityActions from '@/components/opportunities/OpportunityActions';

type Opp = {
  id: string;
  title: string;
  clubId: string;
  clubName: string;
  city?: string;
  sport?: string;
  roleName?: string;
  createdAt?: string;
};

export default function ClubOpportunitiesList({ slug }: { slug: string }) {
  const [items, setItems] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const r = await fetch(`/api/clubs/${encodeURIComponent(slug)}/opportunities`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const dj = await r.json().catch(() => ({}));
        const arr: Opp[] = Array.isArray(dj?.items) ? dj.items : [];
        setItems(arr);
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        📌 Opportunità del club
      </div>

      {loading ? (
        <ul className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-3 h-8 w-52 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </li>
          ))}
        </ul>
      ) : err ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
          Errore: {err}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Nessuna opportunità pubblicata da questo club.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={it.id} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="mb-1 text-sm font-medium">{it.title}</div>
              <div className="text-xs text-neutral-500">
                {it.clubName}
                {it.city ? ` · ${it.city}` : ''}
                {it.roleName ? ` · ${it.roleName}` : ''}
                {it.sport ? ` · ${it.sport}` : ''}
                {it.createdAt ? ` · ${new Date(it.createdAt).toLocaleDateString()}` : ''}
              </div>

              <OpportunityActions
                opportunityId={it.id}
                opportunityTitle={it.title}
                clubId={it.clubId}
                clubName={it.clubName}
                compact
                className="mt-3"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
