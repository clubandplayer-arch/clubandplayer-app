"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import FilterBar from "@/components/filters/FilterBar";
import { useToast } from "@/components/common/ToastProvider";

type ID = string;
type SyncStatus =
  | "synced"
  | "outdated"
  | "conflict"
  | "local_edits"
  | "error"
  | "never_synced";

interface Opportunity {
  id: ID;
  title: string;
  description?: string;
  level?: string;
  role?: string;
  location?: { city?: string; province?: string; region?: string };
  stipendRange?: { min?: number; max?: number; currency?: "EUR" | string };
  expiresAt?: string;
  syncStatus?: SyncStatus;
  lastSyncAt?: string;
  updatedAt: string;
}

interface ApiListResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

function OpportunityCard({ op }: { op: Opportunity }) {
  return (
    <div className="border rounded-2xl p-4 shadow-sm grid gap-2 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{op.title}</h3>
          <div className="text-sm text-gray-600">
            {op.level ? `${op.level} · ` : ""}
            {op.role ? `${op.role} · ` : ""}
            {op.location?.city ||
              op.location?.province ||
              op.location?.region ||
              ""}
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-700 line-clamp-2">
        {op.description ?? ""}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const { show } = useToast();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Ricarica lista quando cambia la URL
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  async function fetchOpportunities(p: number) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(p));
    params.set("pageSize", String(25));

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`/api/opportunities?${params.toString()}`, {
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`API /opportunities ${res.status}`);
      const data = (await res.json()) as ApiListResponse<Opportunity>;
      setItems((prev) => (p === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOpportunities(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, window.location.search]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !loading) setPage((p) => p + 1);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading]);

  const onExport = useCallback(() => {
    try {
      show({
        title: "Export avviato",
        description: "Preparo il CSV…",
        tone: "default",
        durationMs: 1600,
      });
      const sp = new URLSearchParams(window.location.search);
      sp.set("scope", "opportunities");
      const url = `/api/export?${sp.toString()}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      show({
        title: "Export pronto",
        description: "CSV in download.",
        tone: "success",
      });
    } catch (e: any) {
      show({
        title: "Export fallito",
        description: e?.message ?? "Errore imprevisto",
        tone: "error",
      });
    }
  }, [show]);

  return (
    <main className="min-h-screen">
      <FilterBar scope="opportunities" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Opportunità</h1>
          <div className="flex items-center gap-2">
            <button onClick={onExport} className="px-3 py-2 rounded-xl border">
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 border border-red-200">
            Errore: {error}
          </div>
        )}

        {!error && items.length === 0 && !loading ? (
          <div className="mt-16 text-center text-gray-600">
            <p className="text-lg font-medium">Nessun risultato</p>
            <p className="text-sm">Prova a rimuovere o modificare i filtri.</p>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {items.map((op) => (
            <OpportunityCard key={op.id} op={op} />
          ))}
        </section>

        <div
          ref={sentinelRef}
          className="h-12 flex items-center justify-center"
        >
          {loading && (
            <div className="text-gray-500 text-sm">Caricamento…</div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="text-gray-500 text-sm">Fine risultati</div>
          )}
        </div>
      </div>
    </main>
  );
}
