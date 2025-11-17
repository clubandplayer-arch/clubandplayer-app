import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RawRow = Record<string, unknown>;

type LocationRow = {
  region: string;
  province: string;
  city: string;
};

type SourceConfig = {
  table: string;
  regionKey: string;
  provinceKey: string;
  cityKey: string;
};

const SOURCES: SourceConfig[] = [
  { table: 'it_locations_stage', regionKey: 'regione', provinceKey: 'provincia', cityKey: 'comune' },
  { table: 'italy_locations_simple', regionKey: 'region', provinceKey: 'province', cityKey: 'city' },
];

function sortAlpha(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

function isRawRow(row: unknown): row is RawRow {
  if (!row || typeof row !== 'object') return false;
  return !('error' in (row as Record<string, unknown>));
}

function normalizeRow(row: RawRow, config: SourceConfig): LocationRow | null {
  const region = String(row[config.regionKey] ?? '').trim();
  const province = String(row[config.provinceKey] ?? '').trim();
  const city = String(row[config.cityKey] ?? '').trim();
  if (!region || !province || !city) return null;
  return { region, province, city };
}

async function loadLocations() {
  const supabase = await getSupabaseServerClient();
  let lastError: Error | null = null;

  for (const source of SOURCES) {
    const { data, error } = await supabase
      .from(source.table)
      .select(`${source.regionKey},${source.provinceKey},${source.cityKey}`)
      .order(source.regionKey, { ascending: true, nullsFirst: false })
      .order(source.provinceKey, { ascending: true, nullsFirst: false })
      .order(source.cityKey, { ascending: true, nullsFirst: false });

    if (error) {
      lastError = error as Error;
      continue;
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = rows
      .map((row) => (isRawRow(row) ? normalizeRow(row, source) : null))
      .filter((row): row is LocationRow => !!row);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [] as LocationRow[];
}

export async function GET(_req: NextRequest) {
  try {
    const rows = await loadLocations();

    const regionsSet = new Set<string>();
    const provincesByRegion = new Map<string, Set<string>>();
    const citiesByProvince = new Map<string, Set<string>>();

    for (const row of rows) {
      const { region, province, city } = row;

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
