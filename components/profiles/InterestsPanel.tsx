'use client';

import { useEffect, useMemo, useState } from 'react';
import { SPORTS } from '@/lib/opps/constants';
import { COUNTRIES } from '@/lib/geo/countries';
import { useGeo } from '@/hooks/useGeo';

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
  const { regions, getProvinces, getMunicipalities } = useGeo();
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<Array<{ id: number; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);

  // carica iniziale
  useEffect(() => {
    const init = readInterests();
    setState(init);
    onChange?.(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countryCode = useMemo<string>(() => {
    if (!state.country) return 'IT';
    const found = COUNTRIES.find((c) => c.label === state.country);
    return found?.code ?? (state.country || 'IT');
  }, [state.country]);

  const availableRegions = useMemo(() => (countryCode === 'IT' ? regions : []), [countryCode, regions]);

  useEffect(() => {
    if (countryCode !== 'IT' || !regionId) {
      setProvinces([]);
      return;
    }
    let active = true;
    (async () => {
      const rows = await getProvinces(regionId).catch(() => []);
      if (!active) return;
      setProvinces(rows.map((r) => ({ id: Number(r.id), name: r.name })));
    })();
    return () => {
      active = false;
    };
  }, [countryCode, regionId, getProvinces]);

  useEffect(() => {
    if (countryCode !== 'IT' || !provinceId) {
      setCities([]);
      return;
    }
    let active = true;
    (async () => {
      const rows = await getMunicipalities(provinceId).catch(() => []);
      if (!active) return;
      setCities(rows.map((r) => ({ id: Number(r.id), name: r.name })));
    })();
    return () => {
      active = false;
    };
  }, [countryCode, provinceId, getMunicipalities]);

  useEffect(() => {
    if (countryCode !== 'IT') {
      setRegionId(null);
      setProvinceId(null);
      setMunicipalityId(null);
      return;
    }
    if (state.region && !regionId && availableRegions.length) {
      const matched = availableRegions.find((r) => r.name === state.region);
      if (matched) setRegionId(matched.id);
    }
  }, [countryCode, state.region, regionId, availableRegions]);

  useEffect(() => {
    if (countryCode !== 'IT') return;
    if (state.province && !provinceId && provinces.length) {
      const matched = provinces.find((p) => p.name === state.province);
      if (matched) setProvinceId(matched.id);
    }
  }, [countryCode, state.province, provinceId, provinces]);

  useEffect(() => {
    if (countryCode !== 'IT') return;
    if (state.city && !municipalityId && cities.length) {
      const matched = cities.find((m) => m.name === state.city);
      if (matched) setMunicipalityId(matched.id);
    }
  }, [countryCode, state.city, municipalityId, cities]);

  function set<K extends keyof Interests>(k: K, v: Interests[K]) {
    const next: Interests = { ...state, [k]: v };
    if (k === 'country') {
      next.region = undefined;
      next.province = undefined;
      next.city = undefined;
      setRegionId(null);
      setProvinceId(null);
      setMunicipalityId(null);
    }
    if (k === 'region') {
      next.province = undefined;
      next.city = undefined;
      setProvinceId(null);
      setMunicipalityId(null);
    }
    if (k === 'province') {
      next.city = undefined;
      setMunicipalityId(null);
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
              value={regionId ? String(regionId) : ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const name = id ? (availableRegions.find((r) => r.id === id)?.name ?? undefined) : undefined;
                setRegionId(id);
                set('region', name);
              }}
            >
              <option value="">—</option>
              {availableRegions.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.name}</option>
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
              value={provinceId ? String(provinceId) : ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const name = id ? (provinces.find((p) => p.id === id)?.name ?? undefined) : undefined;
                setProvinceId(id);
                set('province', name);
              }}
            >
              <option value="">—</option>
              {provinces.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
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
              value={municipalityId ? String(municipalityId) : ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const name = id ? (cities.find((c) => c.id === id)?.name ?? undefined) : undefined;
                setMunicipalityId(id);
                set('city', name);
              }}
            >
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
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
              setRegionId(null);
              setProvinceId(null);
              setMunicipalityId(null);
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
