import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import {
  ITALIAN_PROVINCE_ABBREVIATIONS,
  normalizeProvinceName,
  type ProvinceAbbreviationMap,
} from '@/lib/geo/provinceAbbreviations';

type ProvinceRow = {
  name?: string | null;
};

let serverProvinceAbbreviationsPromise: Promise<ProvinceAbbreviationMap> | null = null;

export async function getProvinceAbbreviationsServer(): Promise<ProvinceAbbreviationMap> {
  if (!serverProvinceAbbreviationsPromise) {
    serverProvinceAbbreviationsPromise = (async () => {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase.from('provinces').select('name').order('name', { ascending: true });

      if (error) {
        console.error('[geo] unable to load province names', error.message);
        return { ...ITALIAN_PROVINCE_ABBREVIATIONS };
      }

      const mapped = ((data ?? []) as ProvinceRow[]).reduce<ProvinceAbbreviationMap>((acc, row) => {
        const name = (row.name ?? '').trim();
        if (!name) return acc;
        const normalized = normalizeProvinceName(name);
        const sigla = ITALIAN_PROVINCE_ABBREVIATIONS[normalized]?.trim();
        if (!sigla) return acc;
        acc[normalized] = sigla;
        return acc;
      }, {});

      return Object.keys(mapped).length > 0 ? mapped : { ...ITALIAN_PROVINCE_ABBREVIATIONS };
    })();
  }

  return serverProvinceAbbreviationsPromise;
}
