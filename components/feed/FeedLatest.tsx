'use client';

import { useEffect, useState } from 'react';
import OpportunityActions from '@/components/opportunities/OpportunityActions';

type RawOpportunity = any;

type NormalizedOpp = {
  id: string;
  title: string;
  clubId?: string;
  clubName?: string;
  city?: string;
  sport?: string;
  roleName?: string;
  createdAt?: string; // ISO
};

function normalize(raw: RawOpportunity): NormalizedOpp | null {
  if (!raw) return null;

  // id
  const id = String(
    raw.id ?? raw.uuid ?? raw.slug ?? raw.opportunityId ?? raw._id ?? raw.key ?? '',
  ).trim();
  if (!id) return null;

  // title / role
  const title = String(
    raw.title ?? raw.name ?? raw.roleTitle ?? raw.role ?? raw.position ?? 'Opportunità',
  ).trim();

  // club
  const clubObj = raw.club ?? raw.company ?? raw.org ?? {};
  const clubId = clubObj.id ?? clubObj.uuid ?? raw.clubId ?? raw.companyId ?? undefined;
  const clubName = clubObj.name ?? clubObj.title ?? raw.clubName ?? raw.companyName ?? undefined;

  // city
  const city = raw.city ?? raw.location?.city ?? raw.place?.city ?? raw.geo?.city ?? undefined;

  // sport / roleName
  const sport = raw.sport ?? raw.sport_name ?? raw.category ?? undefined;

  const roleName = raw.roleName ?? raw.role ?? raw.position ?? undefined;

  // createdAt
  const createdAtRaw =
    raw.createdAt ??
    raw.created_at ??
    raw.publishedAt ??
    raw.published_at ??
    raw.inserted_at ??
    undefined;
  const createdAt = createdAtRaw ? new Date(createdAtRaw).toISOString() : undefined;

  return {
    id,
    title,
    clubId: clubId ? String(clubId) : undefined,
    clubName,
    city,
    sport,
    roleName,
    createdAt,
  };
}

export default function FeedLatest() {
  const [items, setItems] = useState<NormalizedOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const r = await fetch('/api/opportunities?limit=5', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json().catch(() => ({}));

        const rawList: RawOpportunity[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];

        const normalized = rawList.map(normalize).filter(Boolean) as NormalizedOpp[];

        setItems(normalized);
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          🔴 Ultime opportunità
        </h3>
        <a
          href="/opportunities"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Vedi tutte
        </a>
      </div>

      {loading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-3 h-8 w-52 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </li>
          ))}
        </ul>
      ) : err ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
          Errore nel caricamento: {err}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Nessuna opportunità al momento.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={it.id} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="mb-1 text-sm font-medium">{it.title}</div>
              <div className="text-xs text-neutral-500">
                {it.clubName ? `${it.clubName}` : 'Club'}
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
