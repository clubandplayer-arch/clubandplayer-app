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
  region_id?: number | null;
  province_id?: number | null;
  municipality_id?: number | null;
};

type InterestLocation = {
  interest_country: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
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
  regionId: 'region_id' | 'interest_region_id';
  provinceId: 'province_id' | 'interest_province_id';
  municipalityId: 'municipality_id' | 'interest_municipality_id';
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
      ? {
          country: 'country',
          region: 'region',
          province: 'province',
          city: 'city',
          regionId: 'region_id',
          provinceId: 'province_id',
          municipalityId: 'municipality_id',
        }
      : {
          country: 'interest_country',
          region: 'interest_region',
          province: 'interest_province',
          city: 'interest_city',
          regionId: 'interest_region_id',
          provinceId: 'interest_province_id',
          municipalityId: 'interest_municipality_id',
        };

  const currentCountry = ((value as any)[keys.country] as string | null) || 'IT';
  const currentRegion = ((value as any)[keys.region] as string | null) || null;
  const currentProvince = ((value as any)[keys.province] as string | null) || null;
  const currentCity = ((value as any)[keys.city] as string | null) || null;
  const currentRegionIdFromValue = (value as any)[keys.regionId] as number | null | undefined;
  const currentProvinceIdFromValue = (value as any)[keys.provinceId] as number | null | undefined;
  const currentMunicipalityIdFromValue = (value as any)[keys.municipalityId] as number | null | undefined;

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);

  const [regionId, setRegionId] = useState<number | null>(currentRegionIdFromValue ?? null);
  const [provinceId, setProvinceId] = useState<number | null>(currentProvinceIdFromValue ?? null);

  const title = label || defaultLabels[mode];

  function updateLocation(patch: Partial<Record<string, string | number | null>>) {
    const next = {
      ...value,
      ...(patch[keys.country] !== undefined ? { [keys.country]: patch[keys.country] } : {}),
      ...(patch[keys.region] !== undefined ? { [keys.region]: patch[keys.region] } : {}),
      ...(patch[keys.province] !== undefined ? { [keys.province]: patch[keys.province] } : {}),
      ...(patch[keys.city] !== undefined ? { [keys.city]: patch[keys.city] } : {}),
      ...(patch[keys.regionId] !== undefined ? { [keys.regionId]: patch[keys.regionId] } : {}),
      ...(patch[keys.provinceId] !== undefined ? { [keys.provinceId]: patch[keys.provinceId] } : {}),
      ...(patch[keys.municipalityId] !== undefined ? { [keys.municipalityId]: patch[keys.municipalityId] } : {}),
    } as T;
    onChange(next);
  }

  useEffect(() => {
    if (!currentCountry) {
      updateLocation({ [keys.country]: 'IT' });
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
      updateLocation({
        [keys.region]: null,
        [keys.province]: null,
        [keys.city]: currentCity,
        [keys.regionId]: null,
        [keys.provinceId]: null,
        [keys.municipalityId]: null,
      });
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
    const matchedId =
      currentRegionIdFromValue != null ? currentRegionIdFromValue : findMatchingLocationId(regions, currentRegion);
    setRegionId(matchedId);
  }, [currentCountry, currentRegion, currentRegionIdFromValue, regions]);

  useEffect(() => {
    if (currentCountry !== 'IT') return;
    if (regionId == null) {
      setProvinces([]);
      setProvinceId(null);
      setMunicipalities([]);
      updateLocation({
        [keys.province]: null,
        [keys.city]: null,
        [keys.provinceId]: null,
        [keys.municipalityId]: null,
      });
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
    const matchedId =
      currentProvinceIdFromValue != null ? currentProvinceIdFromValue : findMatchingLocationId(provinces, currentProvince);
    setProvinceId(matchedId);
  }, [currentCountry, currentProvince, currentProvinceIdFromValue, provinces]);

  useEffect(() => {
    if (currentCountry !== 'IT') return;
    if (provinceId == null) {
      setMunicipalities([]);
      updateLocation({ [keys.city]: null, [keys.municipalityId]: null });
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
    updateLocation({
      [keys.region]: name,
      [keys.province]: null,
      [keys.city]: null,
      [keys.regionId]: id,
      [keys.provinceId]: null,
      [keys.municipalityId]: null,
    });
  };

  const handleProvinceChange = (id: number | null) => {
    const name = provinces.find((p) => p.id === id)?.name ?? null;
    setProvinceId(id);
    updateLocation({
      [keys.province]: name,
      [keys.city]: null,
      [keys.provinceId]: id,
      [keys.municipalityId]: null,
    });
  };

  const handleCityChange = (id: number | null) => {
    const name = municipalities.find((m) => m.id === id)?.name ?? null;
    updateLocation({ [keys.city]: name, [keys.municipalityId]: id });
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-sm text-gray-600">{title}</label>
        <select
          className="w-full min-w-0 rounded-lg border p-2"
          value={currentCountry}
          onChange={(e) =>
            updateLocation({
              [keys.country]: e.target.value || null,
              [keys.region]: null,
              [keys.province]: null,
              [keys.city]: null,
              [keys.regionId]: null,
              [keys.provinceId]: null,
              [keys.municipalityId]: null,
            })
          }
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
              value={
                currentMunicipalityIdFromValue != null
                  ? currentMunicipalityIdFromValue
                  : findMatchingLocationId(municipalities, currentCity) ?? ''
              }
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
              onChange={(e) => updateLocation({ [keys.region]: e.target.value || null })}
              placeholder="Es. California"
              disabled={disabled}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Provincia</label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={currentProvince || ''}
              onChange={(e) => updateLocation({ [keys.province]: e.target.value || null })}
              placeholder="Opzionale"
              disabled={disabled}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Città</label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={currentCity || ''}
              onChange={(e) => updateLocation({ [keys.city]: e.target.value || null })}
              placeholder="Es. Sydney"
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}
