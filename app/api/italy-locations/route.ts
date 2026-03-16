import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RawRow = Record<string, unknown>;

type LocationRow = {
  country: string;
  region: string;
  province: string;
  city: string;
};

const SOURCE_TABLE = 'it_locations_stage';
const COUNTRY_CODE = 'IT';

type ApiResponse = {
  source: string;
  sourceColumns: {
    country: string;
    region: string;
    province: string;
    city: string;
  };
  countries: string[];
  regionsByCountry: Record<string, string[]>;
  regions: string[];
  provincesByRegion: Record<string, string[]>;
  citiesByProvince: Record<string, string[]>;
};

function sortAlpha(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

function isRawRow(row: unknown): row is RawRow {
  return !!row && typeof row === 'object' && !('error' in (row as Record<string, unknown>));
}

function normalizeRow(row: RawRow): LocationRow | null {
  const region = String(row.region ?? '').trim();
  const province = String(row.province ?? '').trim();
  const city = String(row.name ?? '').trim();
  if (!region || !province || !city) return null;
  return { country: COUNTRY_CODE, region, province, city };
}

async function loadLocations() {
  const server = await getSupabaseServerClient();
  const admin = getSupabaseAdminClientOrNull();
  const clients = [admin, server].filter(Boolean) as Array<typeof server>;
  let lastError: unknown = null;

  for (const client of clients) {
    const { data, error } = await client
      .from(SOURCE_TABLE)
      .select('name, province, region')
      .order('region', { ascending: true, nullsFirst: false })
      .order('province', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true, nullsFirst: false });

    if (error) {
      lastError = error;
      continue;
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = rows
      .map((row) => (isRawRow(row) ? normalizeRow(row) : null))
      .filter((row): row is LocationRow => !!row);

    if (normalized.length > 0) return normalized;
  }

  if (lastError) throw lastError;
  return [] as LocationRow[];
}

export async function GET(_req: NextRequest) {
  try {
    const rows = await loadLocations();

    const regionsSet = new Set<string>();
    const provincesByRegion = new Map<string, Set<string>>();
    const citiesByProvince = new Map<string, Set<string>>();

    for (const row of rows) {
      regionsSet.add(row.region);

      if (!provincesByRegion.has(row.region)) {
        provincesByRegion.set(row.region, new Set());
      }
      provincesByRegion.get(row.region)!.add(row.province);

      if (!citiesByProvince.has(row.province)) {
        citiesByProvince.set(row.province, new Set());
      }
      citiesByProvince.get(row.province)!.add(row.city);
    }

    const regions = sortAlpha(regionsSet);
    const byCountry: Record<string, string[]> = {
      [COUNTRY_CODE]: regions,
    };

    const provinces: Record<string, string[]> = {};
    for (const [region, items] of provincesByRegion.entries()) {
      provinces[region] = sortAlpha(items);
    }

    const cities: Record<string, string[]> = {};
    for (const [province, items] of citiesByProvince.entries()) {
      cities[province] = sortAlpha(items);
    }

    const response: ApiResponse = {
      source: SOURCE_TABLE,
      sourceColumns: {
        country: COUNTRY_CODE,
        region: 'region',
        province: 'province',
        city: 'name',
      },
      countries: [COUNTRY_CODE],
      regionsByCountry: byCountry,
      regions,
      provincesByRegion: provinces,
      citiesByProvince: cities,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
