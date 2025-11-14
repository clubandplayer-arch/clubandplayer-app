import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type LocationRow = {
  region: string | null;
  province: string | null;
  city: string | null;
};

function sortAlpha(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('italy_locations_simple')
      .select('region,province,city')
      .order('region', { ascending: true, nullsFirst: false })
      .order('province', { ascending: true, nullsFirst: false })
      .order('city', { ascending: true, nullsFirst: false });

    if (error) return jsonError(error.message, 500);

    const rows: LocationRow[] = Array.isArray(data) ? data : [];

    const regionsSet = new Set<string>();
    const provincesByRegion = new Map<string, Set<string>>();
    const citiesByProvince = new Map<string, Set<string>>();

    for (const row of rows) {
      const region = (row.region ?? '').trim();
      const province = (row.province ?? '').trim();
      const city = (row.city ?? '').trim();

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
    const provinces: Record<string, string[]> = {};
    for (const [region, items] of provincesByRegion.entries()) {
      provinces[region] = sortAlpha(items);
    }

    const cities: Record<string, string[]> = {};
    for (const [province, items] of citiesByProvince.entries()) {
      cities[province] = sortAlpha(items);
    }

    return NextResponse.json({
      regions,
      provincesByRegion: provinces,
      citiesByProvince: cities,
    });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
