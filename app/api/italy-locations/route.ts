import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type RawRow = Record<string, unknown>;

type LocationRow = {
  country: string;
  region: string;
  province: string;
  city: string;
};

type SourceConfig = {
  table: string;
  countryKey?: string;
  regionKey: string;
  provinceKey: string;
  cityKey: string;
};

const SOURCES: SourceConfig[] = [
  {
    table: 'it_locations_stage',
    countryKey: 'country',
    regionKey: 'region',
    provinceKey: 'province',
    cityKey: 'city',
  },
  {
    table: 'it_locations_stage',
    regionKey: 'regione',
    provinceKey: 'provincia',
    cityKey: 'comune',
  },
];

const DEFAULT_COUNTRY = 'IT';

function normalizeCountry(raw: string) {
  const value = raw.trim();
  const upper = value.toUpperCase();
  if (upper === 'IT' || upper === 'ITALIA' || upper === 'ITALY') return 'IT';
  return value;
}

function sortAlpha(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

function isRawRow(row: unknown): row is RawRow {
  if (!row || typeof row !== 'object') return false;
  return !('error' in (row as Record<string, unknown>));
}

function normalizeRow(row: RawRow, config: SourceConfig): LocationRow | null {
  const country = normalizeCountry(String(config.countryKey ? row[config.countryKey] ?? '' : DEFAULT_COUNTRY));
  const region = String(row[config.regionKey] ?? '').trim();
  const province = String(row[config.provinceKey] ?? '').trim();
  const city = String(row[config.cityKey] ?? '').trim();
  if (!country || !region || !province || !city) return null;
  return { country, region, province, city };
}

async function loadLocations() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClientOrNull();
  const clients = [admin, supabase].filter(Boolean) as Array<typeof supabase>;
  let lastError: unknown = null;

  for (const source of SOURCES) {
    for (const client of clients) {
      const selectColumns = [source.countryKey, source.regionKey, source.provinceKey, source.cityKey].filter(Boolean).join(',');
      const { data, error } = await client
        .from(source.table)
        .select(selectColumns)
        .order(source.regionKey, { ascending: true, nullsFirst: false })
        .order(source.provinceKey, { ascending: true, nullsFirst: false })
        .order(source.cityKey, { ascending: true, nullsFirst: false });

      if (error) {
        lastError = error;
        continue;
      }

      const rows = Array.isArray(data) ? data : [];
      const normalized = rows
        .map((row) => (isRawRow(row) ? normalizeRow(row, source) : null))
        .filter((row): row is LocationRow => !!row);

      if (normalized.length > 0) {
        return { source, rows: normalized };
      }
    }
  }

  if (lastError) throw lastError;
  return { source: SOURCES[0], rows: [] as LocationRow[] };
}

export async function GET(_req: NextRequest) {
  try {
    const loaded = await loadLocations();
    const rows = loaded.rows;

    const countriesSet = new Set<string>();
    const regionsSet = new Set<string>();
    const regionsByCountry = new Map<string, Set<string>>();
    const provincesByRegion = new Map<string, Set<string>>();
    const citiesByProvince = new Map<string, Set<string>>();

    for (const row of rows) {
      const { country, region, province, city } = row;

      countriesSet.add(country);
      regionsSet.add(region);

      if (!regionsByCountry.has(country)) {
        regionsByCountry.set(country, new Set());
      }
      regionsByCountry.get(country)!.add(region);

      if (!provincesByRegion.has(region)) {
        provincesByRegion.set(region, new Set());
      }
      provincesByRegion.get(region)!.add(province);

      if (!citiesByProvince.has(province)) {
        citiesByProvince.set(province, new Set());
      }
      citiesByProvince.get(province)!.add(city);
    }

    const countries = sortAlpha(countriesSet);
    const regions = sortAlpha(regionsSet);
    const byCountry: Record<string, string[]> = {};
    for (const [country, items] of regionsByCountry.entries()) {
      byCountry[country] = sortAlpha(items);
    }

    const provinces: Record<string, string[]> = {};
    for (const [region, items] of provincesByRegion.entries()) {
      provinces[region] = sortAlpha(items);
    }

    const cities: Record<string, string[]> = {};
    for (const [province, items] of citiesByProvince.entries()) {
      cities[province] = sortAlpha(items);
    }

    return NextResponse.json({
      source: loaded.source.table,
      sourceColumns: {
        country: loaded.source.countryKey ?? DEFAULT_COUNTRY,
        region: loaded.source.regionKey,
        province: loaded.source.provinceKey,
        city: loaded.source.cityKey,
      },
      countries,
      regionsByCountry: byCountry,
      regions,
      provincesByRegion: provinces,
      citiesByProvince: cities,
    });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
