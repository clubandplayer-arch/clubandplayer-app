"use client";

// FilterBar riutilizzabile per Opportunities/Clubs.
// Nessuna dipendenza esterna. ASCII-only.

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Scope = "opportunities" | "clubs";

type Filters = {
  view?: "opps" | "clubs";
  q?: string;
  region?: string;
  role?: string[];
  sort?: "relevance" | "recent" | "closingSoon" | "payDesc" | "payAsc" | "distance" | "lastSync" | "updated";
  page?: number;
  pageSize?: number;
};

function parseFilters(sp: URLSearchParams, scope: Scope): Filters {
  const roleCsv = sp.get("role");
  return {
    view: (sp.get("view") as Filters["view"]) ?? (scope === "opportunities" ? "opps" : "clubs"),
    q: sp.get("q") ?? undefined,
    region: sp.get("region") ?? undefined,
    role: roleCsv ? roleCsv.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    sort: (sp.get("sort") as Filters["sort"]) ?? "recent",
    page: Number(sp.get("page") || 1),
    pageSize: Number(sp.get("pageSize") || 25),
  };
}

function toQueryString(obj: Partial<Filters>) {
  const sp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(","));
    } else if (typeof v === "string") {
      if (v.trim() !== "") sp.set(k, v);
    } else {
      sp.set(k, String(v));
    }
  });
  return sp.toString();
}

export default function FilterBar({ scope }: { scope: Scope }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = useMemo(() => parseFilters(searchParams, scope), [searchParams, scope]);

  const [q, setQ] = useState<string>(initial.q ?? "");
  const [region, setRegion] = useState<string>(initial.region ?? "");
  const [role, setRole] = useState<string>(initial.role?.[0] ?? "");
  const [sort, setSort] = useState<Filters["sort"]>(initial.sort ?? "recent");

  useEffect(() => {
    setQ(initial.q ?? "");
    setRegion(initial.region ?? "");
    setRole(initial.role?.[0] ?? "");
    setSort(initial.sort ?? "recent");
  }, [initial.q, initial.region, initial.role, initial.sort]);

  function apply() {
    const next: Partial<Filters> = {
      view: scope === "opportunities" ? "opps" : "clubs",
      q: q || undefined,
      region: region || undefined,
      role: role ? [role] : undefined,
      sort: sort || "recent",
      page: 1,
    };
    const qs = toQueryString(next);
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function reset() {
    setQ("");
    setRegion("");
    setRole("");
    setSort("recent");
    router.replace(pathname);
  }

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 grid gap-3 md:grid-cols-12 items-end">
        <label className="md:col-span-4 text-sm text-gray-700">
          <span className="block text-xs text-gray-500 mb-1">Ricerca</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            placeholder={scope === "opportunities" ? "Ruolo, club, citta, tag..." : "Nome club, citta..."}
            className="w-full border rounded-xl px-3 py-2"
          />
        </label>

        <label className="md:col-span-3 text-sm text-gray-700">
          <span className="block text-xs text-gray-500 mb-1">Regione</span>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Sicilia, Lazio..."
            className="w-full border rounded-xl px-3 py-2"
          />
        </label>

        {scope === "opportunities" && (
          <label className="md:col-span-3 text-sm text-gray-700">
            <span className="block text-xs text-gray-500 mb-1">Ruolo</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            >
              <option value="">Tutti</option>
              <option value="GK">Portiere</option>
              <option value="DF">Difensore</option>
              <option value="MF">Centrocampista</option>
              <option value="FW">Attaccante</option>
              <option value="Coach">Allenatore</option>
            </select>
          </label>
        )}

        <label className="md:col-span-2 text-sm text-gray-700">
          <span className="block text-xs text-gray-500 mb-1">Ordina</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Filters["sort"])}
            className="w-full border rounded-xl px-3 py-2"
          >
            <option value="recent">Piu recenti</option>
            <option value="closingSoon">In scadenza</option>
            <option value="relevance">Rilevanza</option>
            <option value="lastSync">Ultima sync</option>
          </select>
        </label>

        <div className="md:col-span-12 flex gap-2">
          <button onClick={apply} className="px-3 py-2 rounded-xl bg-blue-600 text-white">
            Applica
          </button>
          <button onClick={reset} className="px-3 py-2 rounded-xl border">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
