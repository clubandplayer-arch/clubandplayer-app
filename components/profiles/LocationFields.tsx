'use client';

import { useEffect, useMemo, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

import {
  fetchLocationChildren,
  findMatchingLocationId,
  LocationOption,
} from '@/lib/geo/location';

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
      return;
    }

    (async () => {
      const r = await fetchLocationChildren(supabase, 'region', null);
      setRegions(r);
    })();
  }, [country, supabase, onChange]);

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
      onChange({ ...value, provinceId: null, municipalityId: null, provinceName: null, cityName: null });
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
      onChange({ ...value, municipalityId: null, cityName: null });
      return;
    }

    (async () => {
      const ms = await fetchLocationChildren(supabase, 'municipality', value.provinceId);
      setMunicipalities(ms);
    })();
  }, [country, onChange, supabase, value]);

  useEffect(() => {
    if (country !== 'IT') return;
    if (!value.municipalityId && municipalities.length && fallback?.city && !appliedFallback.city) {
      const id = findMatchingLocationId(municipalities, fallback.city);
      const name = municipalities.find((m) => m.id === id)?.name ?? fallback.city ?? null;
      if (id) {
        onChange({ ...value, municipalityId: id, cityName: name });
      }
    }
  }, [appliedFallback.city, country, fallback?.city, municipalities, onChange, value]);

  const handleRegionChange = (id: number | null) => {
    const name = regions.find((r) => r.id === id)?.name ?? null;
    onChange({ regionId: id, provinceId: null, municipalityId: null, regionName: name, provinceName: null, cityName: null });
  };

  const handleProvinceChange = (id: number | null) => {
    const name = provinces.find((p) => p.id === id)?.name ?? null;
    onChange({ ...value, provinceId: id, municipalityId: null, provinceName: name, cityName: null });
  };

  const handleMunicipalityChange = (id: number | null) => {
    const name = municipalities.find((m) => m.id === id)?.name ?? null;
    onChange({ ...value, municipalityId: id, cityName: name });
  };

  if (country !== 'IT') return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">{labels.region}</label>
        <select
          className="rounded-lg border p-2"
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

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">{labels.province}</label>
        <select
          className="rounded-lg border p-2 disabled:bg-gray-50"
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

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">{labels.city}</label>
        <select
          className="rounded-lg border p-2 disabled:bg-gray-50"
          value={value.municipalityId ?? ''}
          onChange={(e) => handleMunicipalityChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || !value.provinceId}
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
  );
}
