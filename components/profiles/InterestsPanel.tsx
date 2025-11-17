'use client';

import { useEffect, useMemo, useState } from 'react';
import { SPORTS } from '@/lib/opps/constants';
import { COUNTRIES } from '@/lib/opps/geo';
import { useItalyLocations } from '@/hooks/useItalyLocations';

export type Interests = {
  sports: string[];
  country?: string;
  region?: string;
  province?: string;
  city?: string;
};

export const LS_INTERESTS = 'cp_interests_v1';

type Props = {
  onChange?: (next: Interests) => void;
};

function safeWindow() {
  return typeof window !== 'undefined';
}

function readInterests(): Interests {
  if (!safeWindow()) return { sports: [] };
  try {
    const raw = localStorage.getItem(LS_INTERESTS);
    if (!raw) return { sports: [] };
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return { sports: [] };
    return {
      sports: Array.isArray(obj.sports) ? obj.sports.filter(Boolean) : [],
      country: obj.country || undefined,
      region: obj.region || undefined,
      province: obj.province || undefined,
      city: obj.city || undefined,
    };
  } catch {
    return { sports: [] };
  }
}

function writeInterests(next: Interests) {
  if (!safeWindow()) return;
  try {
    localStorage.setItem(LS_INTERESTS, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('cp:interests-changed'));
  } catch {
    /* noop */
  }
}

export default function InterestsPanel({ onChange }: Props) {
  const [state, setState] = useState<Interests>({ sports: [] });
  const { data: italyLocations } = useItalyLocations();

  // carica iniziale
  useEffect(() => {
    const init = readInterests();
    setState(init);
    // opzionale: notifica subito chi ascolta
    onChange?.(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countryCode = useMemo<string>(() => {
    if (!state.country) return 'IT';
    const found = COUNTRIES.find((c) => c.label === state.country);
    return found?.code ?? (state.country || 'IT');
  }, [state.country]);

  const provinces = useMemo(
    () => (countryCode === 'IT' ? italyLocations.provincesByRegion[state.region ?? ''] ?? [] : []),
    [countryCode, state.region, italyLocations]
  );
  const cities = useMemo(
    () => (countryCode === 'IT' ? italyLocations.citiesByProvince[state.province ?? ''] ?? [] : []),
    [countryCode, state.province, italyLocations]
  );

  function set<K extends keyof Interests>(k: K, v: Interests[K]) {
    const next: Interests = { ...state, [k]: v };
    // reset a cascata
    if (k === 'country') {
      next.region = undefined;
      next.province = undefined;
      next.city = undefined;
    }
    if (k === 'region') {
      next.province = undefined;
      next.city = undefined;
    }
    if (k === 'province') {
      next.city = undefined;
    }
    setState(next);
    writeInterests(next);
    onChange?.(next);
  }

  const selSport = state.sports[0] ?? '';

  return (
    <section className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Interessi feed</h3>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Sport</label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={selSport}
            onChange={(e) => set('sports', e.target.value ? [e.target.value] : [])}
          >
            <option value="">Tutti</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Paese</label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={state.country ?? 'Italia'}
            onChange={(e) => set('country', e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.label}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Regione</label>
          {countryCode === 'IT' ? (
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={state.region ?? ''}
              onChange={(e) => set('region', e.target.value || undefined)}
            >
              <option value="">—</option>
              {italyLocations.regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={state.region ?? ''}
              onChange={(e) => set('region', e.target.value || undefined)}
            />
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Provincia</label>
          {countryCode === 'IT' && provinces.length > 0 ? (
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={state.province ?? ''}
              onChange={(e) => set('province', e.target.value || undefined)}
            >
              <option value="">—</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={state.province ?? ''}
              onChange={(e) => set('province', e.target.value || undefined)}
            />
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Città</label>
          {countryCode === 'IT' && cities.length > 0 ? (
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={state.city ?? ''}
              onChange={(e) => set('city', e.target.value || undefined)}
            >
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={state.city ?? ''}
              onChange={(e) => set('city', e.target.value || undefined)}
            />
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            onClick={() => {
              const next: Interests = { sports: [] };
              setState(next);
              writeInterests(next);
              onChange?.(next);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
