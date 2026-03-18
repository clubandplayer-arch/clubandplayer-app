'use client';

import { useEffect, useState } from 'react';

import type { ProvinceAbbreviationMap } from '@/lib/geo/provinceAbbreviations';

let provinceAbbreviationsCache: ProvinceAbbreviationMap | null = null;
let provinceAbbreviationsPromise: Promise<ProvinceAbbreviationMap> | null = null;

async function loadProvinceAbbreviations(): Promise<ProvinceAbbreviationMap> {
  if (provinceAbbreviationsCache) return provinceAbbreviationsCache;
  if (!provinceAbbreviationsPromise) {
    provinceAbbreviationsPromise = fetch('/api/geo/province-abbreviations', { cache: 'force-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json().catch(() => ({}));
        const data = payload?.data;
        provinceAbbreviationsCache = data && typeof data === 'object' ? (data as ProvinceAbbreviationMap) : {};
        return provinceAbbreviationsCache ?? {};
      })
      .catch((error) => {
        console.error('[geo] unable to load province abbreviations', error);
        provinceAbbreviationsCache = {};
        return provinceAbbreviationsCache;
      }) as Promise<ProvinceAbbreviationMap>;
  }

  return provinceAbbreviationsPromise;
}

export function useProvinceAbbreviations() {
  const [abbreviations, setAbbreviations] = useState<ProvinceAbbreviationMap>(provinceAbbreviationsCache ?? {});

  useEffect(() => {
    let cancelled = false;
    loadProvinceAbbreviations().then((data) => {
      if (!cancelled) setAbbreviations(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return abbreviations;
}
