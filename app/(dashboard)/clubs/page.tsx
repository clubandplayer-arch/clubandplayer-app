// app/(dashboard)/clubs/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FilterBar from "@/components/filters/FilterBar";
import ActiveFiltersBar from "@/components/filters/ActiveFiltersBar";
import SavedViewsBar from "@/components/views/SavedViewsBar";
import { useToast } from "@/components/common/ToastProvider";
import PrevNextPager from "@/components/common/PrevNextPager";
import ResultBadge from "@/components/common/ResultBadge";

// ✅ helpers unificati (16C)
import {
  buildQuery,
  parseFilters,
  parsePage,
} from "@/lib/search/params";

const PAGE_SIZE = 20;

type Club = {
  id: string;
  name: string;
  country?: "IT" | "ES" | "FR" | "DE" | "UK" | "US" | string;
  city?: string;
  role?: string; // compat con colonna esistente (non filtrata dall'API)
  status?: "active" | "inactive" | "archived" | string;
  [key: string]: unknown;
};

export default function ClubsPage() {
  const sp = useSearchParams();
  const { error: toastError } = useToast();

  // ✅ page + filtri centralizzati
  const page = useMemo(() => parsePage(sp), [sp]);
  const filters = useMemo(() => parseFilters(sp), [sp]);

  const [items, setItems] = useState<Club[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // ✅ query string coerente in tutta l'app
  const query = useMemo(
    () => buildQuery(filters, page, PAGE_SIZE),
    [filters, page]
  );

  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clubs?${query}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          items?: Club[];
          total?: number;
          hasMore?: boolean;
        };
        const list = data.items ?? [];
        setItems(list);
        setTotal(typeof data.total === "number" ? data.total : null);
        setHasMore(
          typeof data.hasMore === "boolean" ? data.hasMore : list.length === PAGE_SIZE
        );
      } catch (err) {
        toastError("", {
          title: "Errore caricamento clubs",
          description: err instanceof Error ? err.message : "Unknown error",
          duration: 2500,
        });
        setItems([]);
        setTotal(null);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [query, toastError]);

  return (
    <main className="min-h-screen">
      <SavedViewsBar scope="clubs" />
      <FilterBar scope="clubs" />
      <ActiveFiltersBar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Clubs</h1>

        {loading && (
          <div className="space-y-2">
            <div className="h-10 w-full rounded-md border animate-pulse" />
            <div className="h-10 w-full rounded-md border animate-pulse" />
            <div className="h-10 w-full rounded-md border animate-pulse" />
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 font-medium">Città</th>
                  <th className="text-left px-3 py-2 font-medium">Paese</th>
                  <th className="text-left px-3 py-2 font-medium">Ruolo</th>
                  <th className="text-left px-3 py-2 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">{c.name ?? "—"}</td>
                    <td className="px-3 py-2">{c.city ?? "—"}</td>
                    <td className="px-3 py-2">{c.country ?? "—"}</td>
                    <td className="px-3 py-2">{c.role ?? "—"}</td>
                    <td className="px-3 py-2">{c.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">Nessun club trovato.</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <ResultBadge
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            hasMore={hasMore}
            label="Clubs"
          />
          <PrevNextPager currentPage={page} hasMore={hasMore} label="Clubs" />
        </div>
      </div>
    </main>
  );
}
