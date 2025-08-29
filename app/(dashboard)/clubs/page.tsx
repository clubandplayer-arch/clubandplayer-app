"use client";

import React, { useEffect, useState, useCallback } from "react";
// Import RELATIVO per evitare problemi in CI/Linux
import { useToast } from "../../../components/common/ToastProvider";
import FilterBar from "@/components/filters/FilterBar";
import SavedViewsBar from "@/components/views/SavedViewsBar";

type Club = { id: string; name: string };

export default function ClubsPage() {
  const toastApi = useToast() as any;

  const notify = useCallback((opts: any) => {
    if (toastApi?.toast) return toastApi.toast(opts);
    if (toastApi?.show) return toastApi.show(opts);
    if (toastApi?.add) return toastApi.add(opts);
    if (typeof toastApi === "function") return toastApi(opts);
  }, [toastApi]);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      // mock: sostituisci con fetch reale
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
      {/* FilterBar richiede scope */}
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
