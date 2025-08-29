"use client";

import React, { useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Chiavi filtro da mostrare come badge */
  keys?: string[];
  /** Se true, resetta anche ?page= quando cambi i filtri */
  resetPageOnChange?: boolean;
};

export default function ActiveFiltersBar({
  keys = ["q", "role", "country", "status", "city", "from", "to"],
  resetPageOnChange = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const labels: Record<string, string> = {
    q: "Cerca",
    role: "Ruolo",
    country: "Paese",
    status: "Stato",
    city: "Città",
    from: "Dal",
    to: "Al",
  };

  const displayValue = (k: string, v: string) => {
    if (k === "country") {
      const map: Record<string, string> = {
        IT: "Italia",
        ES: "Spagna",
        FR: "Francia",
        DE: "Germania",
        UK: "Regno Unito",
        US: "USA",
      };
      return map[v] ?? v;
    }
    if (k === "role") {
      const map: Record<string, string> = {
        player: "Giocatore",
        coach: "Allenatore",
        staff: "Staff",
        scout: "Scout",
        director: "Direttore",
      };
      return map[v] ?? v;
    }
    if (k === "status") {
      const map: Record<string, string> = {
        open: "Aperto",
        closed: "Chiuso",
        draft: "Bozza",
        archived: "Archiviato",
      };
      return map[v] ?? v;
    }
    return v;
  };

  const active = useMemo(() => {
    const out: Array<{ key: string; label: string; value: string }> = [];
    for (const k of keys) {
      const raw = sp.get(k);
      if (raw && raw.trim() !== "") {
        out.push({ key: k, label: labels[k] ?? k, value: displayValue(k, raw) });
      }
    }
    return out;
  }, [sp, keys]);

  const replaceParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(sp.toString());
      mutate(params);
      if (resetPageOnChange) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, sp, resetPageOnChange]
  );

  const clearOne = useCallback((k: string) => {
    replaceParams((p) => p.delete(k));
  }, [replaceParams]);

  const clearAll = useCallback(() => {
    replaceParams((p) => {
      for (const k of keys) p.delete(k);
    });
  }, [keys, replaceParams]);

  if (active.length === 0) return null;

  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">
          Filtri attivi:
        </span>

        {active.map(({ key, label, value }) => (
          <span
            key={key}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
          >
            <span className="text-slate-600">
              <b>{label}:</b> {value}
            </span>
            <button
              type="button"
              onClick={() => clearOne(key)}
              className="rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-100"
              aria-label={`Rimuovi filtro ${label}`}
              title={`Rimuovi filtro ${label}`}
            >
              ×
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={clearAll}
          className="ml-auto rounded-full border px-3 py-1 text-xs hover:bg-slate-50"
          title="Rimuovi tutti i filtri"
        >
          Pulisci tutto
        </button>
      </div>
    </div>
  );
}
