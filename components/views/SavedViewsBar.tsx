"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/common/ToastProvider";
import { buildQuery, parseFilters } from "@/lib/search/params";
import { SavedView } from "@/lib/types/views";

type Props = {
  scope: "clubs" | "opportunities";
};

export default function SavedViewsBar({ scope }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const { success, error } = useToast();

  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);

  // carica viste salvate dal server
  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/views?scope=${scope}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setViews(data.items ?? []);
      } catch (err) {
        error("", {
          title: "Errore caricamento viste",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [scope, error]);

  // salva una nuova vista
  async function handleSave() {
    const filters = parseFilters(sp);
    const name = prompt("Nome della vista salvata:");
    if (!name) return;
    try {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, name, filters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newView: SavedView = await res.json();
      setViews((prev) => [...prev, newView]);
      success("Vista salvata");
    } catch (err) {
      error("", { title: "Errore salvataggio", description: (err as Error).message });
    }
  }

  // applica una vista
  function handleApply(v: SavedView) {
    const qs = buildQuery(v.filters, 1, 20);
    router.push(`/${scope}?${qs}`);
  }

  // elimina una vista
  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa vista?")) return;
    try {
      const res = await fetch(`/api/views?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setViews((prev) => prev.filter((v) => v.id !== id));
      success("Vista eliminata");
    } catch (err) {
      error("", { title: "Errore eliminazione", description: (err as Error).message });
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-slate-50">
      <button
        onClick={handleSave}
        className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm"
        disabled={loading}
      >
        Salva vista
      </button>
      <div className="flex gap-2 overflow-x-auto">
        {views.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-1 px-2 py-1 border rounded-md bg-white shadow-sm text-sm"
          >
            <button onClick={() => handleApply(v)}>{v.name}</button>
            <button
              onClick={() => handleDelete(v.id)}
              className="text-red-500 text-xs ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
