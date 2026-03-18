'use client';

import { useCallback, useEffect, useState } from 'react';

export type GeoRegion = { id: number; name: string };
export type GeoProvince = { id: number; name: string; region_id: number };
export type GeoMunicipality = { id: number; name: string; province_id: number };

type State = {
  regions: GeoRegion[];
  provincesByRegion: Record<number, GeoProvince[]>;
  municipalitiesByProvince: Record<number, GeoMunicipality[]>;
};

const cache: State = {
  regions: [],
  provincesByRegion: {},
  municipalitiesByProvince: {},
};

let inflightRegions: Promise<GeoRegion[]> | null = null;

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  return (json?.data ?? []) as T;
}

export function useGeo() {
  const [regions, setRegions] = useState<GeoRegion[]>(cache.regions);
  const [provincesByRegion, setProvincesByRegion] = useState<Record<number, GeoProvince[]>>(cache.provincesByRegion);
  const [municipalitiesByProvince, setMunicipalitiesByProvince] = useState<Record<number, GeoMunicipality[]>>(
    cache.municipalitiesByProvince,
  );
  const [loading, setLoading] = useState(cache.regions.length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadRegions = useCallback(async () => {
    if (cache.regions.length > 0) return cache.regions;
    if (inflightRegions) return inflightRegions;

    inflightRegions = fetch('/api/geo/regions', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        return readJson<GeoRegion[]>(res);
      })
      .finally(() => {
        inflightRegions = null;
      });

    const data = await inflightRegions;
    cache.regions = data;
    return data;
  }, []);

  const getProvinces = useCallback(async (regionId: number) => {
    if (!regionId || !Number.isFinite(regionId)) return [] as GeoProvince[];
    if (cache.provincesByRegion[regionId]) return cache.provincesByRegion[regionId];

    const res = await fetch(`/api/geo/provinces?regionId=${regionId}`, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const rows = await readJson<GeoProvince[]>(res);
    cache.provincesByRegion[regionId] = rows;
    setProvincesByRegion((prev) => ({ ...prev, [regionId]: rows }));
    return rows;
  }, []);

  const getMunicipalities = useCallback(async (provinceId: number) => {
    if (!provinceId || !Number.isFinite(provinceId)) return [] as GeoMunicipality[];
    if (cache.municipalitiesByProvince[provinceId]) return cache.municipalitiesByProvince[provinceId];

    const res = await fetch(`/api/geo/municipalities?provinceId=${provinceId}`, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const rows = await readJson<GeoMunicipality[]>(res);
    cache.municipalitiesByProvince[provinceId] = rows;
    setMunicipalitiesByProvince((prev) => ({ ...prev, [provinceId]: rows }));
    return rows;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await loadRegions();
        if (!active) return;
        setRegions(data);
        setProvincesByRegion({ ...cache.provincesByRegion });
        setMunicipalitiesByProvince({ ...cache.municipalitiesByProvince });
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Impossibile caricare la geografia');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadRegions]);

  return {
    regions,
    provincesByRegion,
    municipalitiesByProvince,
    getProvinces,
    getMunicipalities,
    loading,
    error,
  };
}
