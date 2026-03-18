import { getSupabaseServerClient } from '@/lib/supabase/server';

export type ProvinceAbbreviationMap = Record<string, string>;

type ProvinceRow = {
  name?: string | null;
  sigla?: string | null;
};

let serverProvinceAbbreviationsPromise: Promise<ProvinceAbbreviationMap> | null = null;

export function normalizeProvinceName(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

export function provinceDisplayValue(
  province: string | null | undefined,
  abbreviations?: ProvinceAbbreviationMap | null,
) {
  const currentValue = (province ?? '').trim();
  if (!currentValue) return '';
  const sigla = abbreviations?.[normalizeProvinceName(currentValue)]?.trim();
  return sigla || currentValue;
}

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
