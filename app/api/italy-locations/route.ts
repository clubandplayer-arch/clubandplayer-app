import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const revalidate = 86400;

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('it_locations_stage')
    .select('name, province, region');

  console.log('GEO rows:', data?.length);
  console.log('GEO sample:', data?.slice(0, 5));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const regionsSet = new Set<string>();
  const provincesByRegionSets: Record<string, Set<string>> = {};
  const citiesByProvinceSets: Record<string, Set<string>> = {};

  for (const row of data ?? []) {
    const city = row.name?.trim();
    const province = row.province?.trim();
    const region = row.region?.trim();

    if (!city || !province || !region) continue;

    regionsSet.add(region);

    if (!provincesByRegionSets[region]) {
      provincesByRegionSets[region] = new Set<string>();
    }
    provincesByRegionSets[region].add(province);

    if (!citiesByProvinceSets[province]) {
      citiesByProvinceSets[province] = new Set<string>();
    }
    citiesByProvinceSets[province].add(city);
  }

  const regions = [...regionsSet].sort((a, b) => a.localeCompare(b));

  const provincesByRegion = Object.fromEntries(
    Object.entries(provincesByRegionSets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, provinces]) => [
        region,
        [...provinces].sort((a, b) => a.localeCompare(b)),
      ]),
  );

  const citiesByProvince = Object.fromEntries(
    Object.entries(citiesByProvinceSets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([province, cities]) => [
        province,
        [...cities].sort((a, b) => a.localeCompare(b)),
      ]),
  );

  return NextResponse.json({
    regions,
    provincesByRegion,
    citiesByProvince,
  });
}
