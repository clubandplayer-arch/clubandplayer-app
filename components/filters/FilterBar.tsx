"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type Scope = "clubs" | "opportunities";

type Props = {
  scope: Scope;
};

/**
 * FilterBar
 * - campi: q (ricerca), role, country
 * - sync bidirezionale con l'URL (?q=roma&role=coach&country=IT)
 * - mantiene eventuali altri parametri presenti nella query
 * - pulsante Reset
 */
export default function FilterBar({ scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stato inizializzato dalla query corrente
  const [q, setQ] = useState<string>(() => searchParams.get("q") ?? "");
  const [role, setRole] = useState<string>(() => searchParams.get("role") ?? "");
  const [country, setCountry] = useState<string>(() => searchParams.get("country") ?? "");

  // Helper: costruisce nuova URL preservando gli altri parametri
  const buildUrl = useCallback(
    (next: Partial<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(next).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      });

      // mantieni sempre lo scope coerente
      params.set("scope", scope);

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, scope, searchParams]
  );

  // Debounced update URL quando cambiano i filtri
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(buildUrl({ q, role, country }), { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [q, role, country, buildUrl, router]);

  // Se cambia l'URL dall'esterno, riallinea lo stato locale
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setRole(searchParams.get("role") ?? "");
    setCountry(searchParams.get("country") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const onReset = useCallback(() => {
    setQ("");
    setRole("");
    setCountry("");
    router.replace(buildUrl({ q: null, role: null, country: null }), { scroll: false });
  }, [buildUrl, router]);

  // Opzioni UI
  const countries = useMemo(
    () => [
      { code: "", name: "Tutti i paesi" },
      { code: "IT", name: "Italia" },
      { code: "ES", name: "Spagna" },
      { code: "FR", name: "Francia" },
      { code: "DE", name: "Germania" },
      { code: "UK", name: "Regno Unito" },
      { code: "US", name: "Stati Uniti" },
    ],
    []
  );

  const roles = useMemo(
    () => [
      { code: "", name: "Tutti i ruoli" },
      { code: "player", name: "Giocatore" },
      { code: "coach", name: "Allenatore" },
      { code: "staff", name: "Staff" },
      { code: "scout", name: "Scout" },
      { code: "director", name: "Direttore" },
    ],
    []
  );

  return (
    <section className="w-full border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="text-sm text-slate-600 md:mr-2 shrink-0">
            Filtri — <span className="font-semibold">{scope}</span>
          </div>

          <div className="flex flex-1 gap-3 items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca (es. Roma, club, ruolo, …)"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            >
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
