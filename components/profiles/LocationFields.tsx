'use client';

import { useEffect, useMemo, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

import { COUNTRIES } from '@/lib/opps/geo';
import {
  fetchLocationChildren,
  findMatchingLocationId,
  LocationOption,
} from '@/lib/geo/location';

type BaseLocation = {
  country: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
};

type InterestLocation = {
  interest_country: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
};

export type LocationValue = BaseLocation | InterestLocation;

type Props<T extends LocationValue> = {
  supabase: SupabaseClient;
  mode: 'base' | 'interest';
  value: T;
  onChange: (value: T) => void;
  label?: string;
  disabled?: boolean;
};

type LocationKeys = {
  country: 'country' | 'interest_country';
  region: 'region' | 'interest_region';
  province: 'province' | 'interest_province';
  city: 'city' | 'interest_city';
};

const defaultLabels: Record<'base' | 'interest', string> = {
  base: 'Sede',
  interest: 'Zona di interesse',
};

export function LocationFields<T extends LocationValue>({
  supabase,
  mode,
  value,
  onChange,
  label,
  disabled = false,
}: Props<T>) {
  const keys: LocationKeys =
    mode === 'base'
      ? { country: 'country', region: 'region', province: 'province', city: 'city' }
      : {
          country: 'interest_country',
          region: 'interest_region',
          province: 'interest_province',
          city: 'interest_city',
        };

  const currentCountry = ((value as any)[keys.country] as string | null) || 'IT';
  const currentRegion = ((value as any)[keys.region] as string | null) || null;
  const currentProvince = ((value as any)[keys.province] as string | null) || null;
  const currentCity = ((value as any)[keys.city] as string | null) || null;

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);

  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);

  const title = label || defaultLabels[mode];

  function updateLocation(patch: Partial<Record<keyof LocationKeys, string | null>>) {
    const next = {
      ...value,
      ...(patch.country !== undefined ? { [keys.country]: patch.country } : {}),
      ...(patch.region !== undefined ? { [keys.region]: patch.region } : {}),
      ...(patch.province !== undefined ? { [keys.province]: patch.province } : {}),
      ...(patch.city !== undefined ? { [keys.city]: patch.city } : {}),
    } as T;
    onChange(next);
  }

  useEffect(() => {
    if (!currentCountry) {
      updateLocation({ country: 'IT' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountry]);

  useEffect(() => {
    if (currentCountry !== 'IT') {
      setRegions([]);
      setProvinces([]);
      setMunicipalities([]);
      setRegionId(null);
      setProvinceId(null);
      updateLocation({ region: null, province: null, city: currentCity });
      return;
    }

    let cancelled = false;
    (async () => {
      const r = await fetchLocationChildren(supabase, 'region', null);
      if (cancelled) return;
      setRegions(r);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountry, supabase]);

  useEffect(() => {
    if (currentCountry !== 'IT') return;
    const matchedId = findMatchingLocationId(regions, currentRegion);
    setRegionId(matchedId);
  }, [currentCountry, currentRegion, regions]);

  useEffect(() => {
    if (currentCountry !== 'IT') return;
    if (regionId == null) {
      setProvinces([]);
      setProvinceId(null);
      setMunicipalities([]);
      updateLocation({ province: null, city: null });
      return;
    }

    let cancelled = false;
    (async () => {
      const ps = await fetchLocationChildren(supabase, 'province', regionId);
      if (cancelled) return;
      setProvinces(ps);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountry, regionId, supabase]);

  useEffect(() => {
    if (currentCountry !== 'IT') return;
    const matchedId = findMatchingLocationId(provinces, currentProvince);
    setProvinceId(matchedId);
  }, [currentCountry, currentProvince, provinces]);

  useEffect(() => {
    if (currentCountry !== 'IT') return;
    if (provinceId == null) {
      setMunicipalities([]);
      updateLocation({ city: null });
      return;
    }

    let cancelled = false;
    (async () => {
      const ms = await fetchLocationChildren(supabase, 'municipality', provinceId);
      if (cancelled) return;
      setMunicipalities(ms);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountry, provinceId, supabase]);

  const countryLabel = useMemo(
    () => COUNTRIES.find((c) => c.code === currentCountry)?.label ?? currentCountry,
    [currentCountry],
  );

  const handleRegionChange = (id: number | null) => {
    const name = regions.find((r) => r.id === id)?.name ?? null;
    setRegionId(id);
    setProvinceId(null);
    updateLocation({ region: name, province: null, city: null });
  };

  const handleProvinceChange = (id: number | null) => {
    const name = provinces.find((p) => p.id === id)?.name ?? null;
    setProvinceId(id);
    updateLocation({ province: name, city: null });
  };

  const handleCityChange = (id: number | null) => {
    const name = municipalities.find((m) => m.id === id)?.name ?? null;
    updateLocation({ city: name });
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-sm text-gray-600">{title}</label>
        <select
          className="w-full min-w-0 rounded-lg border p-2"
          value={currentCountry}
          onChange={(e) => updateLocation({ country: e.target.value || null, region: null, province: null, city: null })}
          disabled={disabled}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        {countryLabel ? (
          <span className="text-xs text-gray-500">{countryLabel}</span>
        ) : null}
      </div>

      {currentCountry === 'IT' ? (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Regione</label>
            <select
              className="w-full min-w-0 rounded-lg border p-2"
              value={regionId ?? ''}
              onChange={(e) => handleRegionChange(e.target.value ? Number(e.target.value) : null)}
              disabled={disabled}
            >
              <option value="">— Seleziona regione —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Provincia</label>
            <select
              className="w-full min-w-0 rounded-lg border p-2 disabled:bg-gray-50"
              value={provinceId ?? ''}
              onChange={(e) => handleProvinceChange(e.target.value ? Number(e.target.value) : null)}
              disabled={disabled || !regionId}
            >
              <option value="">— Seleziona provincia —</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Città</label>
            <select
              className="w-full min-w-0 rounded-lg border p-2 disabled:bg-gray-50"
              value={findMatchingLocationId(municipalities, currentCity) ?? ''}
              onChange={(e) => handleCityChange(e.target.value ? Number(e.target.value) : null)}
              disabled={disabled || !provinceId}
            >
              <option value="">— Seleziona città —</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Regione / Stato</label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={currentRegion || ''}
              onChange={(e) => updateLocation({ region: e.target.value || null })}
              placeholder="Es. California"
              disabled={disabled}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Provincia</label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={currentProvince || ''}
              onChange={(e) => updateLocation({ province: e.target.value || null })}
              placeholder="Opzionale"
              disabled={disabled}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Città</label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={currentCity || ''}
              onChange={(e) => updateLocation({ city: e.target.value || null })}
              placeholder="Es. Sydney"
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}
