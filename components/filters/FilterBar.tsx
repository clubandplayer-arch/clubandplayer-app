'use client';

import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type Scope = 'clubs' | 'opportunities';

type Props = {
  scope: Scope;
};

/**
 * FilterBar avanzata
 * - campi: q, role, country, status, city, from, to
 * - sync bidirezionale con l'URL
 * - Reset (azzera anche ?page=)
 * - hotkeys:
 *    • ⌘/Ctrl + K → focus su "Cerca"
 *    • / (slash) → focus su "Cerca" se non stai già scrivendo in un campo
 */
export default function FilterBar({ scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchRef = useRef<HTMLInputElement | null>(null);

  // Stato inizializzato dalla query corrente
  const [q, setQ] = useState<string>(() => searchParams.get('q') ?? '');
  const [role, setRole] = useState<string>(() => searchParams.get('role') ?? '');
  const [country, setCountry] = useState<string>(() => searchParams.get('country') ?? '');
  const [status, setStatus] = useState<string>(() => searchParams.get('status') ?? '');
  const [city, setCity] = useState<string>(() => searchParams.get('city') ?? '');
  const [from, setFrom] = useState<string>(() => searchParams.get('from') ?? '');
  const [to, setTo] = useState<string>(() => searchParams.get('to') ?? '');

  // Helper: costruisce nuova URL preservando gli altri parametri
  const buildUrl = useCallback(
    (next: Partial<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(next).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') params.delete(key);
        else params.set(key, String(value));
      });

      // mantieni sempre lo scope coerente
      params.set('scope', scope);

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, scope, searchParams],
  );

  // Debounced update URL quando cambiano i filtri
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(buildUrl({ q, role, country, status, city, from, to }), { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [q, role, country, status, city, from, to, buildUrl, router]);

  // Se cambia l'URL dall'esterno, riallinea lo stato locale
  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
    setRole(searchParams.get('role') ?? '');
    setCountry(searchParams.get('country') ?? '');
    setStatus(searchParams.get('status') ?? '');
    setCity(searchParams.get('city') ?? '');
    setFrom(searchParams.get('from') ?? '');
    setTo(searchParams.get('to') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const onReset = useCallback(() => {
    setQ('');
    setRole('');
    setCountry('');
    setStatus('');
    setCity('');
    setFrom('');
    setTo('');
    router.replace(
      buildUrl({
        q: null,
        role: null,
        country: null,
        status: null,
        city: null,
        from: null,
        to: null,
        page: null,
      }),
      { scroll: false },
    );
  }, [buildUrl, router]);

  // Hotkeys: ⌘/Ctrl+K e '/' (slash)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTypingTarget =
        active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      // ⌘/Ctrl + K
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const metaPressed = isMac ? e.metaKey : e.ctrlKey;
      if (metaPressed && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // '/' → solo se non stai già digitando in un campo
      if (!isTypingTarget && e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Opzioni UI
  const countries = useMemo(
    () => [
      { code: '', name: 'Tutti i paesi' },
      { code: 'IT', name: 'Italia' },
      { code: 'ES', name: 'Spagna' },
      { code: 'FR', name: 'Francia' },
      { code: 'DE', name: 'Germania' },
      { code: 'UK', name: 'Regno Unito' },
      { code: 'US', name: 'Stati Uniti' },
    ],
    [],
  );

  const roles = useMemo(
    () => [
      { code: '', name: 'Tutti i ruoli' },
      { code: 'player', name: 'Giocatore' },
      { code: 'coach', name: 'Allenatore' },
      { code: 'staff', name: 'Staff' },
      { code: 'scout', name: 'Scout' },
      { code: 'director', name: 'Direttore' },
    ],
    [],
  );

  const statuses = useMemo(
    () => [
      { code: '', name: 'Tutti gli stati' },
      { code: 'open', name: 'Aperto' },
      { code: 'closed', name: 'Chiuso' },
      { code: 'draft', name: 'Bozza' },
      { code: 'archived', name: 'Archiviato' },
    ],
    [],
  );

  return (
    <section className="w-full border-b bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="text-sm text-slate-600">
            Filtri — <span className="font-semibold">{scope}</span>
            <span className="ml-3 text-xs text-slate-400">(⌘/Ctrl+K o / per cercare)</span>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-6">
            <input
              ref={searchRef}
              id="filterbar-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca (es. Roma, club, ruolo, …)"
              title="Scorciatoie: ⌘/Ctrl+K o /"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 md:col-span-2"
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

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            >
              {statuses.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Città"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-6">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span>Dal</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span>Al</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <div className="flex justify-end md:col-span-4">
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
      </div>
    </section>
  );
}
