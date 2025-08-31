"use client";

import { useEffect, useState } from "react";
import { SavedView } from "@/lib/types/views";
import { useToast } from "@/components/common/ToastProvider";
import { createClient } from "@supabase/supabase-js";

// Supabase client lato client (usa le NEXT_PUBLIC_* che hai già in .env.local)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

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
        if (!res.ok) {
          // Se hai 401 perché non loggato, non mostrare errore rumoroso
          if (res.status === 401) {
            setViews([]);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setViews(data.items ?? []);
      } catch (err) {
        error("", {
          title: "Errore caricamento viste",
          description: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [scope, error]);

  // crea una nuova vista: aggiunge automaticamente user_id dell’utente loggato
  async function create(view: Omit<SavedView, "id" | "createdAt">) {
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = data?.user?.id;
      if (!userId) {
        error("", {
          title: "Non sei autenticato",
          description: "Effettua il login per salvare una vista.",
        });
        return;
      }

      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...view, user_id: userId }), // 👈 passiamo user_id richiesto dalla route
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // La tua route POST ritorna l’oggetto creato (SavedView)
      const newView: SavedView = await res.json();
      setViews((prev) => [...prev, newView]);
      success("Vista salvata");
      return newView;
    } catch (err) {
      error("", {
        title: "Errore salvataggio vista",
        description: (err as Error).message,
      });
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/views?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setViews((prev) => prev.filter((v) => v.id !== id));
      success("Vista eliminata");
    } catch (err) {
      error("", {
        title: "Errore eliminazione vista",
        description: (err as Error).message,
      });
    }
  }

  return { views, loading, create, remove };
}
