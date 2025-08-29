// app/(dashboard)/opportunities/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { useToast } from "@/components/common/ToastProvider";
import SavedViewsBar from "@/components/views/SavedViewsBar";
import FilterBar from "@/components/filters/FilterBar";

type Opportunity = {
  id: string;
  title: string;
  club?: string;
  location?: string;
  postedAt?: string; // ISO
  [key: string]: any;
};

const PAGE_SIZE = 20;

export default function OpportunitiesPage() {
  const { show } = useToast();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Eventuale stato filtri (se servono parametri di query aggiungerli qui)
  const filters = useMemo(() => ({} as Record<string, string | number | boolean>), []);

  const fetchPage = useCallback(
    async (nextPage: number) => {
      if (loading || !hasMore) return;
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
          // ...qui puoi aggiungere filtri: es. scope, query ecc.
        });

        const res = await fetch(`/api/opportunities?${qs.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status}`);
        }

        const data = (await res.json()) as {
          items: Opportunity[];
          total?: number;
          hasMore?: boolean;
        };

        setItems((prev) => [...prev, ...(data.items || [])]);
        setHasMore(data.hasMore ?? (data.items?.length ?? 0) === PAGE_SIZE);
        setPage(nextPage);
      } catch (err) {
        console.error(err);
        show("Errore nel caricamento delle opportunità");
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, show]
  );

  // Prima pagina
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1);
  }, [fetchPage, filters]);

  // Infinite scroll sentinel
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    onIntersect: () => {
      if (!loading && hasMore) fetchPage(page + 1);
    },
    disabled: !hasMore || loading,
    rootMargin: "600px",
  });

  const onExport = useCallback(() => {
    try {
      if (!items.length) {
        show("Non ci sono dati da esportare");
        return;
      }
      const csv = toCSV(items);
      downloadCSV(`opportunities_${new Date().toISOString().slice(0, 10)}.csv`, csv);
      show("Export completato");
    } catch (e) {
      console.error(e);
      show("Errore durante l'export");
    }
  }, [items, show]);

  return (
    <main className="min-h-screen">
      <FilterBar scope="opportunities" />
      <SavedViewsBar scope="opportunities" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Opportunità</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Esporta CSV
            </button>
          </div>
        </header>

        {/* Lista */}
        <ul className="divide-y rounded-xl border bg-white">
          {items.map((op) => (
            <li key={op.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{op.title}</div>
                  <div className="text-sm text-gray-500">
                    {op.club ? `${op.club} • ` : ""}
                    {op.location ?? ""}
                    {op.postedAt ? ` • ${new Date(op.postedAt).toLocaleDateString()}` : ""}
                  </div>
                </div>
                {/* azioni riga se servono */}
              </div>
            </li>
          ))}
          {!items.length && !loading && (
            <li className="p-8 text-center text-gray-500">Nessuna opportunità</li>
          )}
        </ul>

        {/* Loader + Sentinel */}
        <div className="flex justify-center py-6">
          {loading ? <span className="text-sm text-gray-500">Carico…</span> : null}
        </div>
        <div ref={sentinelRef} aria-hidden />
        {!hasMore && items.length > 0 && (
          <div className="py-4 text-center text-sm text-gray-500">
            Hai visto tutte le opportunità
          </div>
        )}
      </div>
    </main>
  );
}
