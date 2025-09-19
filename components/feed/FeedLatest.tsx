'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Opportunity } from '@/types/opportunity';

type Op = Partial<Opportunity> & {
  id?: string | number;
  title?: string;
  created_at?: string;
  club?: { name?: string };
  club_name?: string;
  clubName?: string;
  location?: string;
};

export default function FeedLatest() {
  const [items, setItems] = useState<Op[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const urls = [
          '/api/opportunities/filter?limit=10&order=desc',
          '/api/opportunities?limit=10',
        ];

        let data: any = null;
        for (const url of urls) {
          try {
            const r = await fetch(url, {
              signal: ac.signal,
              credentials: 'include',
              cache: 'no-store',
            });
            if (!r.ok) continue;
            const j = await r.json().catch(() => null);
            if (j && Array.isArray(j)) { data = j; break; }
            if (j && Array.isArray(j?.data)) { data = j.data; break; }
          } catch {
            /* tenta il prossimo url */
          }
        }

        if (!data) throw new Error('Nessun dato disponibile dalle API');

        setItems(data as Op[]);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message ?? 'Errore di caricamento');
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const normalized = useMemo(() => {
    return items.map((it) => {
      const id =
        it.id ??
        (it as any).opportunity_id ??
        (it as any).opportunityId ??
        (it as any).slug;
      const title = it.title ?? (it as any).name ?? 'Opportunità';
      const club =
        it.club?.name ??
        it.club_name ??
        (it as any).clubName ??
        (it as any).club ??
        '—';
      const when =
        it.created_at ??
        (it as any).createdAt ??
        (it as any).inserted_at ??
        (it as any).created_at;
      const loc =
        it.location ?? (it as any).city ?? (it as any).region ?? (it as any).place;

      return { id, title, club, when, loc };
    });
  }, [items]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-red-600 dark:text-red-400">
          Errore: {error}
        </div>
      </div>
    );
  }

  if (!normalized.length) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          Nessuna opportunità recente.
        </div>
        <div className="mt-3">
          <Link
            href="/opportunities"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Vai alla lista completa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-0 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
      <div className="border-b p-4 text-sm font-semibold dark:border-neutral-800">
        Ultime opportunità
      </div>

      <ul className="divide-y dark:divide-neutral-800">
        {normalized.map((row, idx) => (
          <li key={`${row.id ?? idx}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.title}</div>
                <div className="truncate text-sm text-neutral-500">
                  {row.club}{row.loc ? ` • ${row.loc}` : ''}
                </div>
                {row.when && (
                  <div className="truncate text-xs text-neutral-400 mt-1">
                    {new Date(row.when).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex gap-2">
                <Link
                  href={row.id ? `/opportunities/${row.id}` : '/opportunities'}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Apri
                </Link>
                <Link
                  href={row.id ? `/opportunities/${row.id}` : '/opportunities'}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Dettagli
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t p-3 text-right text-sm dark:border-neutral-800">
        <Link
          href="/opportunities"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Vedi tutte
        </Link>
      </div>
    </div>
  );
}
