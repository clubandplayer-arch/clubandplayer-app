"use client";

/**
 * Page Clubs — versione minimale.
 * Mantiene l'uso di FilterBar e SavedViewsBar.
 * Sistemato l'useEffect per evitare il warning su window.location.search.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/common/ToastProvider";
import FilterBar from "@/components/filters/FilterBar";
import SavedViewsBar from "@/components/views/SavedViewsBar";

type Club = {
  id: string;
  name: string;
};

export default function ClubsPage() {
  const { toast } = useToast();
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
      toast({ title: "Errore caricamento clubs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // No deps su window.location.search per evitare warning
  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  return (
    <div className="p-4">
      <SavedViewsBar />
      <FilterBar />

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
