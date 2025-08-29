"use client";

import { useEffect, useState } from "react";
import { SavedView } from "@/lib/types/views";
import { useToast } from "@/components/common/ToastProvider";

export function useSavedViews(scope: "clubs" | "opportunities") {
  const { success, error } = useToast();
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);

  // carica all’avvio
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
        error("", { title: "Errore caricamento viste", description: (err as Error).message });
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [scope, error]);

  async function create(view: Omit<SavedView, "id" | "createdAt">) {
    try {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(view),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newView: SavedView = await res.json();
      setViews((prev) => [...prev, newView]);
      success("Vista salvata");
      return newView;
    } catch (err) {
      error("", { title: "Errore salvataggio vista", description: (err as Error).message });
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/views?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setViews((prev) => prev.filter((v) => v.id !== id));
      success("Vista eliminata");
    } catch (err) {
      error("", { title: "Errore eliminazione vista", description: (err as Error).message });
    }
  }

  return { views, loading, create, remove };
}
