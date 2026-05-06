import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ITALY_COUNTRY_CODE = 'IT';

type LocationRow = {
  name: string;
  province: string;
  region: string;
};

function sortAlpha(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('it_locations_stage')
      .select('name,province,region')
      .order('region', { ascending: true, nullsFirst: false })
      .order('province', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true, nullsFirst: false });

    if (error) throw error;

    const rows = Array.isArray(data) ? (data as LocationRow[]) : [];

    const regionsSet = new Set<string>();
    const provincesByRegion = new Map<string, Set<string>>();
    const citiesByProvince = new Map<string, Set<string>>();

    for (const row of rows) {
      const region = String(row.region ?? '').trim();
      const province = String(row.province ?? '').trim();
      const city = String(row.name ?? '').trim();
      if (!region || !province || !city) continue;

      regionsSet.add(region);

      if (!provincesByRegion.has(region)) {
        provincesByRegion.set(region, new Set());
      }
      provincesByRegion.get(region)!.add(province);

      if (!citiesByProvince.has(province)) {
        citiesByProvince.set(province, new Set());
      }
      citiesByProvince.get(province)!.add(city);
    }

    const regions = sortAlpha(regionsSet);

    const regionsByCountry: Record<string, string[]> = {
      [ITALY_COUNTRY_CODE]: regions,
    };

    const provinces: Record<string, string[]> = {};
    for (const [region, items] of provincesByRegion.entries()) {
      provinces[region] = sortAlpha(items);
    }

    const cities: Record<string, string[]> = {};
    for (const [province, items] of citiesByProvince.entries()) {
      cities[province] = sortAlpha(items);
    }

    return NextResponse.json({
      countries: [ITALY_COUNTRY_CODE],
      regionsByCountry,
      provincesByRegion: provinces,
      citiesByProvince: cities,
      // backward compatibility for existing consumers
      regions,
    });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
