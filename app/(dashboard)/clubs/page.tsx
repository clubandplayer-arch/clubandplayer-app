"use client";

/**
 * Page Clubs — versione minimale (fix import Toast, scope richiesto su FilterBar).
 */

import React, { useEffect, useState, useCallback } from "react";
// IMPORT RELATIVO per evitare problemi di risoluzione su Linux/CI
import { useToast } from "../../../components/common/ToastProvider";
import FilterBar from "@/components/filters/FilterBar";
import SavedViewsBar from "@/components/views/SavedViewsBar";

type Club = {
  id: string;
  name: string;
};

export default function ClubsPage() {
  // Adapter sul provider del toast (firma variabile tra i progetti)
  const toastApi = useToast() as any;
  const notify = (opts: any) => {
    if (toastApi?.toast) return toastApi.toast(opts);
    if (toastApi?.show) return toastApi.show(opts);
    if (toastApi?.add) return toastApi.add(opts);
    if (typeof toastApi === "function") return toastApi(opts);
    return void 0;
  };

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      // mock fetch (sostituisci con la tua API)
      const data: Club[] = [
        { id: "1", name: "AC Test" },
        { id: "2", name: "FC Example" },
      ];
      setClubs(data);
    } catch {
      notify({ title: "Errore caricamento clubs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  return (
    <div className="p-4">
      <SavedViewsBar />
      {/* scope è obbligatorio nel tipo di FilterBar */}
      <FilterBar scope="clubs" />

      {loading && <div className="mt-4 text-sm text-gray-500">Caricamento…</div>}

      {!loading && (
        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {clubs.map((c) => (
            <li key={c.id} className="border rounded-xl p-3">
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
