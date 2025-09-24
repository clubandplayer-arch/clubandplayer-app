'use client';

import { useEffect, useMemo, useState } from 'react';
import OpportunitiesFilterBar, { OppFilters } from '@/components/opportunities/OpportunitiesFilterBar';
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

  const id = String(
    raw.id ?? raw.uuid ?? raw.slug ?? raw.opportunityId ?? raw._id ?? raw.key ?? ''
  ).trim();
  if (!id) return null;

  const title = String(
    raw.title ?? raw.name ?? raw.roleTitle ?? raw.role ?? raw.position ?? 'Opportunità'
  ).trim();

  const clubObj = raw.club ?? raw.company ?? raw.org ?? {};
  const clubId = clubObj.id ?? clubObj.uuid ?? raw.clubId ?? raw.companyId ?? undefined;
  const clubName = clubObj.name ?? clubObj.title ?? raw.clubName ?? raw.companyName ?? undefined;

  const city = raw.city ?? raw.location?.city ?? raw.place?.city ?? raw.geo?.city ?? undefined;

  const sport = raw.sport ?? raw.sport_name ?? raw.category ?? undefined;
  const roleName = raw.roleName ?? raw.role ?? raw.position ?? undefined;

  const createdAtRaw =
    raw.createdAt ?? raw.created_at ?? raw.publishedAt ?? raw.published_at ?? raw.inserted_at ?? undefined;
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

const PAGE_SIZE = 10;

export default function OpportunitiesPage() {
  const [filters, setFilters] = useState<OppFilters>({});
  const [items, setItems] = useState<NormalizedOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      await load(filters);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(f: OppFilters) {
    try {
      setLoading(true);
      setErr(null);
      setPage(1);

      const qs = new URLSearchParams();
      if (f.role) qs.set('role', f.role);
      if (f.city) qs.set('city', f.city);

      let res = await fetch(`/api/opportunities/filter?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        res = await fetch('/api/opportunities', {
          credentials: 'include',
          cache: 'no-store',
        });
      }

      const data = await res.json().catch(() => ({}));
      const rawList: RawOpportunity[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      let normalized = rawList.map(normalize).filter(Boolean) as NormalizedOpp[];
      if (res.url.endsWith('/api/opportunities')) {
        normalized = normalized.filter((it) => {
          const okRole = f.role
            ? (it.roleName || it.title || '').toLowerCase().includes(f.role!.toLowerCase())
            : true;
          const okCity = f.city ? (it.city || '').toLowerCase().includes(f.city!.toLowerCase()) : true;
          return okRole && okCity;
        });
      }

      normalized.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(normalized);
      setFilters(f);
    } catch (e: any) {
      setErr(e?.message || 'Errore inatteso');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const end = page * PAGE_SIZE;
    return items.slice(0, end);
  }, [items, page]);

  const canLoadMore = visible.length < items.length;

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8 flex flex-col gap-6">
          <OpportunitiesFilterBar
            initial={filters}
            onApply={(f) => load(f)}
          />

          <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                🔍 Risultati Opportunità
              </h3>
              <div className="text-xs text-neutral-500">
                {loading ? 'Caricamento…' : `${items.length} risultati`}
              </div>
            </div>

            {loading ? (
              <ul className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
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
            ) : visible.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
                Nessuna opportunità trovata. Prova a modificare i filtri.
              </div>
            ) : (
              <>
                <ul className="space-y-4">
                  {visible.map((it) => (
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
                        opportunityTitle={it.title} {/* 👈 passiamo il titolo */}
                        clubId={it.clubId}
                        clubName={it.clubName}
                        compact
                        className="mt-3"
                      />
                    </li>
                  ))}
                </ul>

                {canLoadMore && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-neutral-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Mostra altri
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </section>

        <aside className="hidden xl:col-span-4 xl:block">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Suggerimenti</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              A breve qui compariranno alert salvati, ricerche recenti e suggerimenti personalizzati.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
