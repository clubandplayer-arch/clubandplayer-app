import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { normalizeProvinceName, type ProvinceAbbreviationMap } from '@/lib/geo/provinceAbbreviations';

type ProvinceRow = {
  name?: string | null;
  sigla?: string | null;
};

let serverProvinceAbbreviationsPromise: Promise<ProvinceAbbreviationMap> | null = null;

export async function getProvinceAbbreviationsServer(): Promise<ProvinceAbbreviationMap> {
  if (!serverProvinceAbbreviationsPromise) {
    serverProvinceAbbreviationsPromise = (async () => {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from('provinces')
        .select('name,sigla')
        .order('name', { ascending: true });

      if (error) {
        console.error('[geo] unable to load province abbreviations', error.message);
        return {};
      }

      return ((data ?? []) as ProvinceRow[]).reduce<ProvinceAbbreviationMap>((acc, row) => {
        const name = (row.name ?? '').trim();
        const sigla = (row.sigla ?? '').trim();
        if (!name || !sigla) return acc;
        acc[normalizeProvinceName(name)] = sigla;
        return acc;
      }, {});
    })();
  }

  return serverProvinceAbbreviationsPromise;
}
