'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { COUNTRIES, type ItalyLocations } from '@/lib/opps/geo';

type FetchResponse = {
  countries?: string[];
  regionsByCountry?: Record<string, string[]>;
  provincesByRegion?: Record<string, string[]>;
  citiesByProvince?: Record<string, string[]>;
  regions?: string[];
};

const EMPTY_LOCATIONS: ItalyLocations = {
  regions: [],
  regionsByCountry: {},
  provincesByRegion: {},
  citiesByProvince: {},
};

let cached: ItalyLocations | null = null;
let inflight: Promise<ItalyLocations> | null = null;

async function fetchLocations(force = false): Promise<ItalyLocations> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  const request = fetch('/api/italy-locations', { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json().catch(() => ({}))) as FetchResponse;
      const regionsByCountry = json.regionsByCountry ?? {};
      const italyRegions = regionsByCountry.IT ?? (Array.isArray(json.regions) ? json.regions : []);

      return {
        regions: italyRegions,
        regionsByCountry,
        provincesByRegion: json.provincesByRegion ?? {},
        citiesByProvince: json.citiesByProvince ?? {},
      } satisfies ItalyLocations;
    })
    .finally(() => {
      inflight = null;
    });

  inflight = request;
  const data = await request;
  cached = data;
  return data;
}

export function useItalyLocations() {
  const [data, setData] = useState<ItalyLocations>(cached ?? EMPTY_LOCATIONS);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const result = await fetchLocations(force);
      setData(result);
      setError(null);
      return result;
    } catch (err: any) {
      setError(err?.message || 'Impossibile caricare le località');
      setData(EMPTY_LOCATIONS);
      return EMPTY_LOCATIONS;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await fetchLocations();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Impossibile caricare le località');
          setData(EMPTY_LOCATIONS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const countries = useMemo(() => COUNTRIES, []);

  return { data, loading, error, refresh, countries };
}
