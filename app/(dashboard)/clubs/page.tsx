"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/common/ToastProvider";
import FilterBar from "@/components/filters/FilterBar";

type SyncStatus =
  | "synced"
  | "outdated"
  | "conflict"
  | "local_edits"
  | "error"
  | "never_synced";

interface Club {
  id: string;
  name: string;
  city?: string;
  province?: string;
  region?: string;
  level?: "Pro" | "Dilettanti" | "Giovanili" | "Scuola Calcio" | string;
  badges?: Array<"verified" | "partner" | "premium" | string>;
  logoUrl?: string;
  lastSyncAt?: string;
  syncStatus?: SyncStatus;
  updatedAt: string;
}

interface ApiListResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

function Row({ c }: { c: Club }) {
  return (
    <tr className="border-b hover:bg-neutral-50">
      <td className="p-3">
        <a href={`/clubs/${c.id}`} className="text-blue-600 hover:underline">
          {c.name}
        </a>
      </td>
      <td className="p-3">
        {c.city}
        {c.province ? ` (${c.province})` : ""} • {c.region}
      </td>
      <td className="p-3">{c.level || "—"}</td>
      <td className="p-3">
        {c.badges && c.badges.length ? c.badges.join(", ") : "—"}
      </td>
    </tr>
  );
}

export default function ClubsPage() {
  const { show } = useToast();
  const [data, setData] = useState<ApiListResponse<Club> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPage() {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has("page")) sp.set("page", "1");
    if (!sp.has("pageSize")) sp.set("pageSize", "50");
    try {
      const res = await fetch(`/api/clubs?${sp.toString()}`);
      if (!res.ok) throw new Error(`API /clubs ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage();
  }, [window.location.search]);

  const onExport = useCallback(() => {
    try {
      show({
        title: "Export avviato",
        description: "Preparo il CSV…",
        durationMs: 1600,
      });
      const sp = new URLSearchParams(window.location.search);
      sp.set("scope", "clubs");
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
      <FilterBar scope="clubs" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Club</h1>
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

        {!error && !loading && data && data.items.length === 0 ? (
          <div className="mt-16 text-center text-gray-600">
            <p className="text-lg font-medium">Nessun club trovato</p>
            <p className="text-sm">Prova a rimuovere o modificare i filtri.</p>
          </div>
        ) : null}

        <div className="overflow-x-auto border rounded-2xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Località</th>
                <th className="p-3 font-medium">Livello</th>
                <th className="p-3 font-medium">Badge</th>
              </tr>
            </thead>
            <tbody>{data?.items.map((c) => <Row key={c.id} c={c} />)}</tbody>
          </table>
        </div>

        {loading && (
          <div className="mt-4 text-gray-500 text-sm">Caricamento…</div>
        )}
      </div>
    </main>
  );
}
