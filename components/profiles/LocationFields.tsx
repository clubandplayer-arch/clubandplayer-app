'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

import {
  fetchLocationChildren,
  findMatchingLocationId,
  LocationOption,
  normalizeLocation,
} from '@/lib/geo/location';
import { isEuCountry } from '@/lib/geo/countries';

export type LocationSelection = {
  regionId: number | null;
  provinceId: number | null;
  municipalityId: number | null;
  regionName?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
};

export type LocationFallback = {
  region?: string | null;
  province?: string | null;
  city?: string | null;
};

type Props = {
  supabase: SupabaseClient;
  country: string;
  value: LocationSelection;
  fallback?: LocationFallback;
  onChange: (value: LocationSelection) => void;
  labels?: {
    region: string;
    province: string;
    city: string;
  };
  disabled?: boolean;
};

const defaultLabels = {
  region: 'Regione',
  province: 'Provincia',
  city: 'Città',
};

export function LocationFields({
  supabase,
  country,
  value,
  fallback,
  onChange,
  labels = defaultLabels,
  disabled = false,
}: Props) {
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [cityFallback, setCityFallback] = useState<string | null>(null);
  const didInitCity = useRef(false);
  const prevCountryRef = useRef(country);

  const normalizeLoc = useCallback((s?: string | null) => normalizeLocation(s), []);
  const savedCity = useMemo(
    () => value.cityName || fallback?.city || null,
    [fallback?.city, value.cityName],
  );

  const appliedFallback = useMemo(
    () => ({
      region: !!value.regionId,
      province: !!value.provinceId,
      city: !!value.municipalityId,
    }),
    [value.regionId, value.provinceId, value.municipalityId],
  );

  useEffect(() => {
    if (country !== 'IT') {
      setRegions([]);
      setProvinces([]);
      setMunicipalities([]);
      onChange({ regionId: null, provinceId: null, municipalityId: null, regionName: null, provinceName: null, cityName: null });
      setCityFallback(null);
      didInitCity.current = false;
      return;
    }

    (async () => {
      const r = await fetchLocationChildren(supabase, 'region', null);
      setRegions(r);
    })();
  }, [country, supabase, onChange]);

  useEffect(() => {
    if (country === prevCountryRef.current) return;

    const switchedToNonIT = country !== 'IT';
    if (switchedToNonIT) {
      if (value.regionId || value.provinceId || value.municipalityId || value.provinceName) {
        onChange({
          ...value,
          regionId: null,
          provinceId: null,
          municipalityId: null,
          provinceName: null,
        });
      }
      setProvinces([]);
      setMunicipalities([]);
      setCityFallback(value.cityName || fallback?.city || null);
      didInitCity.current = false;
    }

    prevCountryRef.current = country;
  }, [country, fallback?.city, onChange, value]);

  useEffect(() => {
    if (country !== 'IT') return;
    if (!value.regionId && regions.length && fallback?.region && !appliedFallback.region) {
      const id = findMatchingLocationId(regions, fallback.region);
      const name = regions.find((r) => r.id === id)?.name ?? fallback.region ?? null;
      if (id) {
        onChange({ ...value, regionId: id, regionName: name, provinceId: null, municipalityId: null });
      }
    }
  }, [appliedFallback.region, country, fallback?.region, onChange, regions, value]);

  useEffect(() => {
    if (country !== 'IT') return;
    if (value.regionId == null) {
      setProvinces([]);
      if (value.provinceId !== null || value.municipalityId !== null || value.provinceName || value.cityName) {
        onChange({ ...value, provinceId: null, municipalityId: null, provinceName: null, cityName: null });
      }
      setCityFallback(null);
      didInitCity.current = false;
      return;
    }

    (async () => {
      const ps = await fetchLocationChildren(supabase, 'province', value.regionId);
      setProvinces(ps);
    })();
  }, [country, onChange, supabase, value]);

  useEffect(() => {
    if (country !== 'IT') return;
    if (!value.provinceId && provinces.length && fallback?.province && !appliedFallback.province) {
      const id = findMatchingLocationId(provinces, fallback.province);
      const name = provinces.find((p) => p.id === id)?.name ?? fallback.province ?? null;
      if (id) {
        onChange({ ...value, provinceId: id, provinceName: name, municipalityId: null });
      }
    }
  }, [appliedFallback.province, country, fallback?.province, onChange, provinces, value]);

  useEffect(() => {
    if (country !== 'IT') return;
    if (value.provinceId == null) {
      setMunicipalities([]);
      if (value.municipalityId !== null || value.cityName) {
        onChange({ ...value, municipalityId: null, cityName: null });
      }
      setCityFallback(null);
      didInitCity.current = false;
      return;
    }

    (async () => {
      const ms = await fetchLocationChildren(supabase, 'municipality', value.provinceId);
      setMunicipalities(ms);
    })();
  }, [country, onChange, supabase, value]);

  useEffect(() => {
    if (country !== 'IT') return;
    if (!municipalities.length) return;
    if (didInitCity.current) return;

    if (value.municipalityId) {
      const name = municipalities.find((m) => m.id === value.municipalityId)?.name ?? value.cityName ?? null;
      if (name && name !== value.cityName) {
        onChange({ ...value, cityName: name });
      }
      didInitCity.current = true;
      return;
    }

    if (savedCity) {
      const normalizedSaved = normalizeLoc(savedCity);
      const matched = municipalities.find((m) => normalizeLoc(m.name) === normalizedSaved);
      if (matched) {
        setCityFallback(null);
        onChange({ ...value, municipalityId: matched.id, cityName: matched.name });
      } else {
        setCityFallback(savedCity);
        if (value.cityName !== savedCity) {
          onChange({ ...value, cityName: savedCity });
        }
      }
      didInitCity.current = true;
    }
  }, [appliedFallback.city, country, municipalities, onChange, savedCity, value, normalizeLoc]);

  const handleRegionChange = (id: number | null) => {
    if (id === value.regionId) return;
    didInitCity.current = false;
    setCityFallback(null);
    const name = regions.find((r) => r.id === id)?.name ?? null;
    onChange({ regionId: id, provinceId: null, municipalityId: null, regionName: name, provinceName: null, cityName: null });
  };

  const handleProvinceChange = (id: number | null) => {
    if (id === value.provinceId) return;
    didInitCity.current = false;
    setCityFallback(null);
    const name = provinces.find((p) => p.id === id)?.name ?? null;
    onChange({ ...value, provinceId: id, municipalityId: null, provinceName: name, cityName: null });
  };

  const handleMunicipalityChange = (raw: string) => {
    if (raw === '__saved__') {
      onChange({ ...value, municipalityId: null, cityName: cityFallback });
      return;
    }
    const id = raw ? Number(raw) : null;
    const name = municipalities.find((m) => m.id === id)?.name ?? null;
    setCityFallback(null);
    onChange({ ...value, municipalityId: id, cityName: name });
  };

  const municipalityOptions = useMemo(() => {
    const opts: Array<LocationOption & { isFallback?: boolean }> = [...municipalities];
    if (cityFallback) {
      opts.unshift({ id: -1, name: `${cityFallback} (salvata)`, isFallback: true });
    }
    return opts;
  }, [cityFallback, municipalities]);

  const selectedMunicipalityValue =
    value.municipalityId != null ? String(value.municipalityId) : cityFallback ? '__saved__' : '';

  if (country !== 'IT') {
    const regionValue = value.regionName ?? fallback?.region ?? '';
    const cityValue = value.cityName ?? fallback?.city ?? '';
    const disabledProvince = true;

    return (
      <>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm text-gray-600">{labels.region}</label>
          <input
            className="w-full min-w-0 rounded-lg border p-2"
            value={regionValue}
            onChange={(e) =>
              onChange({
                ...value,
                regionName: e.target.value,
                provinceName: null,
                regionId: null,
                provinceId: null,
                municipalityId: null,
              })
            }
            disabled={disabled}
            placeholder="Es. Île-de-France"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm text-gray-600">{labels.city}</label>
          <input
            className="w-full min-w-0 rounded-lg border p-2"
            value={cityValue}
            onChange={(e) =>
              onChange({
                ...value,
                cityName: e.target.value,
                provinceId: null,
                municipalityId: null,
                provinceName: null,
              })
            }
            disabled={disabled}
            required={isEuCountry(country)}
            placeholder="Es. Parigi"
          />
        </div>

        <input type="hidden" value="" aria-hidden disabled={disabledProvince} />
      </>
    );
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-sm text-gray-600">{labels.region}</label>
        <select
          className="w-full min-w-0 rounded-lg border p-2"
          value={value.regionId ?? ''}
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
        <label className="text-sm text-gray-600">{labels.province}</label>
        <select
          className="w-full min-w-0 rounded-lg border p-2 disabled:bg-gray-50"
          value={value.provinceId ?? ''}
          onChange={(e) => handleProvinceChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || !value.regionId}
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
        <label className="text-sm text-gray-600">{labels.city}</label>
        <select
          className="w-full min-w-0 rounded-lg border p-2 disabled:bg-gray-50"
          value={selectedMunicipalityValue}
          onChange={(e) => handleMunicipalityChange(e.target.value)}
          disabled={disabled || !value.provinceId}
        >
          <option value="">— Seleziona città —</option>
          {municipalityOptions.map((m) => (
            <option key={`${m.id}-${m.name}`} value={m.isFallback ? '__saved__' : m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
