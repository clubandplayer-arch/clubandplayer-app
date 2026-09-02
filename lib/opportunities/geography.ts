import type { SupabaseClient } from '@supabase/supabase-js';

import { COUNTRIES } from '@/lib/geo/countries';
import { UUID_PATTERN } from '@/lib/geo/areas';

export type OpportunityCanonicalArea = {
  id: string;
  countryId: string;
  parentId: string | null;
  officialName: string;
  areaType: string;
  level: number;
};

export type OpportunityGeographyRead = {
  source: 'canonical' | 'canonical_country' | 'legacy_text' | 'none';
  countryId: string | null;
  countryIso2: string | null;
  countryName: string | null;
  geoAreaId: string | null;
  ancestors: OpportunityCanonicalArea[];
  area: OpportunityCanonicalArea | null;
  legacy: { country: string | null; region: string | null; province: string | null; city: string | null };
};

export type OpportunityGeographyCommand =
  | { kind: 'absent' }
  | { kind: 'legacy' }
  | { kind: 'reset' }
  | { kind: 'country_only'; countryId: string }
  | { kind: 'full'; countryId: string; geoAreaId: string };

export type OpportunityGeographyWritePlan = {
  country_id: string | null;
  geo_area_id: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
};

type CountryRow = {
  id: string;
  iso2: string;
  official_name: string;
  is_supported: boolean;
  is_active: boolean;
};

type AreaRow = {
  id: string;
  country_id: string;
  parent_id: string | null;
  official_name: string;
  area_type: string;
  level: number;
  is_active: boolean;
};

const LEGACY_FIELDS = ['country', 'region', 'province', 'city'] as const;
const REGION_TYPES = new Set(['REGION', 'AUTONOMOUS_COMMUNITY', 'CANTON', 'STATISTICAL_REGION', 'VOIVODESHIP']);
const PROVINCE_TYPES = new Set(['PROVINCE', 'DEPARTMENT', 'DISTRICT', 'POWIAT']);
const CITY_TYPES = new Set(['MUNICIPALITY', 'COMMUNE', 'GMINA']);

export class OpportunityGeographyError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_GEOGRAPHY'
      | 'COUNTRY_NOT_AVAILABLE'
      | 'AREA_NOT_AVAILABLE'
      | 'COUNTRY_AREA_MISMATCH'
      | 'HIERARCHY_INVALID'
      | 'UNSUPPORTED_AREA_TYPE',
    message: string,
  ) {
    super(message);
    this.name = 'OpportunityGeographyError';
  }
}

function own(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function nullableUuid(value: unknown, field: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw new OpportunityGeographyError('INVALID_GEOGRAPHY', `${field} must be a UUID or null`);
  }
  return value.trim();
}

export function parseOpportunityGeographyCommand(body: Record<string, unknown>): OpportunityGeographyCommand {
  const hasCountry = own(body, 'country_id') || own(body, 'countryId');
  const hasArea = own(body, 'geo_area_id') || own(body, 'geoAreaId');
  const hasLegacy = LEGACY_FIELDS.some((field) => own(body, field));

  if (!hasCountry && !hasArea) return hasLegacy ? { kind: 'legacy' } : { kind: 'absent' };
  if (!hasCountry) {
    throw new OpportunityGeographyError('INVALID_GEOGRAPHY', 'geo_area_id requires an explicit country_id');
  }

  const countryId = nullableUuid(body.country_id ?? body.countryId, 'country_id');
  const geoAreaId = hasArea ? nullableUuid(body.geo_area_id ?? body.geoAreaId, 'geo_area_id') : null;
  if (!countryId && geoAreaId) {
    throw new OpportunityGeographyError('INVALID_GEOGRAPHY', 'geo_area_id requires country_id');
  }
  if (!countryId) return { kind: 'reset' };
  if (!geoAreaId) return { kind: 'country_only', countryId };
  return { kind: 'full', countryId, geoAreaId };
}

function toCanonicalArea(row: AreaRow): OpportunityCanonicalArea {
  return {
    id: row.id,
    countryId: row.country_id,
    parentId: row.parent_id,
    officialName: row.official_name,
    areaType: row.area_type,
    level: Number(row.level),
  };
}

function countryLabel(country: CountryRow) {
  return COUNTRIES.find((option) => option.code === country.iso2)?.label ?? country.official_name;
}

async function loadCountry(client: SupabaseClient, countryId: string, writable: boolean): Promise<CountryRow> {
  let query = client
    .from('countries')
    .select('id,iso2,official_name,is_supported,is_active')
    .eq('id', countryId);
  if (writable) query = query.eq('is_supported', true).eq('is_active', true);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new OpportunityGeographyError('COUNTRY_NOT_AVAILABLE', 'canonical country is not available');
  return data as CountryRow;
}

async function loadAreaChain(client: SupabaseClient, areaId: string, countryId: string, writable: boolean) {
  const reversed: AreaRow[] = [];
  const seen = new Set<string>();
  let cursor: string | null = areaId;
  while (cursor) {
    if (seen.has(cursor) || reversed.length >= 16) {
      throw new OpportunityGeographyError('HIERARCHY_INVALID', 'canonical geography hierarchy is cyclic or too deep');
    }
    seen.add(cursor);
    let query = client
      .from('geo_areas')
      .select('id,country_id,parent_id,official_name,area_type,level,is_active')
      .eq('id', cursor);
    if (writable) query = query.eq('is_active', true);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) throw new OpportunityGeographyError('AREA_NOT_AVAILABLE', 'canonical geo area is not available');
    const row = data as AreaRow;
    if (row.country_id !== countryId) {
      throw new OpportunityGeographyError('COUNTRY_AREA_MISMATCH', 'canonical geo area does not belong to country');
    }
    reversed.push(row);
    cursor = row.parent_id;
  }
  return reversed.reverse();
}

export function projectOpportunityLegacyGeography(country: CountryRow, chain: OpportunityCanonicalArea[]) {
  const projection = { country: countryLabel(country), region: null as string | null, province: null as string | null, city: null as string | null };
  for (const area of chain) {
    if (REGION_TYPES.has(area.areaType)) projection.region = area.officialName;
    else if (PROVINCE_TYPES.has(area.areaType)) projection.province = area.officialName;
    else if (CITY_TYPES.has(area.areaType)) projection.city = area.officialName;
    else throw new OpportunityGeographyError('UNSUPPORTED_AREA_TYPE', `unsupported canonical area type: ${area.areaType}`);
  }
  return projection;
}

export async function buildOpportunityGeographyWritePlan(
  client: SupabaseClient,
  command: Exclude<OpportunityGeographyCommand, { kind: 'absent' } | { kind: 'legacy' }>,
): Promise<OpportunityGeographyWritePlan> {
  if (command.kind === 'reset') {
    return { country_id: null, geo_area_id: null, country: null, region: null, province: null, city: null };
  }
  const country = await loadCountry(client, command.countryId, true);
  if (command.kind === 'country_only') {
    return { country_id: country.id, geo_area_id: null, country: countryLabel(country), region: null, province: null, city: null };
  }
  const chain = (await loadAreaChain(client, command.geoAreaId, command.countryId, true)).map(toCanonicalArea);
  return { country_id: country.id, geo_area_id: command.geoAreaId, ...projectOpportunityLegacyGeography(country, chain) };
}

/** Validates a canonical filter and returns the selected area plus every active descendant. */
export async function getOpportunityGeoAreaFilterScope(
  client: SupabaseClient,
  countryId: string,
  geoAreaId?: string | null,
): Promise<string[] | null> {
  const canonicalCountryId = nullableUuid(countryId, 'country_id');
  const canonicalAreaId = nullableUuid(geoAreaId, 'geo_area_id');
  if (!canonicalCountryId) {
    throw new OpportunityGeographyError('INVALID_GEOGRAPHY', 'country_id is required for canonical filters');
  }
  await loadCountry(client, canonicalCountryId, true);
  if (!canonicalAreaId) return null;
  const selectedAreaId = canonicalAreaId;
  await loadAreaChain(client, selectedAreaId, canonicalCountryId, true);

  const scope = new Set<string>([selectedAreaId]);
  let parents = [selectedAreaId];
  for (let depth = 0; parents.length && depth < 16; depth += 1) {
    const { data, error } = await client
      .from('geo_areas')
      .select('id')
      .eq('country_id', canonicalCountryId)
      .eq('is_active', true)
      .in('parent_id', parents);
    if (error) throw error;
    const children = (data ?? []).flatMap((row) =>
      typeof row.id === 'string' && !scope.has(row.id) ? [row.id] : [],
    );
    for (const id of children) scope.add(id);
    parents = children;
  }
  if (parents.length) {
    throw new OpportunityGeographyError('HIERARCHY_INVALID', 'canonical geography hierarchy is too deep');
  }
  return [...scope];
}

export function clearCanonicalOpportunityGeography() {
  return { country_id: null, geo_area_id: null } as const;
}

export async function resolveOpportunityGeography(
  client: SupabaseClient,
  row: Record<string, unknown>,
): Promise<OpportunityGeographyRead> {
  const legacy = {
    country: typeof row.country === 'string' && row.country.trim() ? row.country : null,
    region: typeof row.region === 'string' && row.region.trim() ? row.region : null,
    province: typeof row.province === 'string' && row.province.trim() ? row.province : null,
    city: typeof row.city === 'string' && row.city.trim() ? row.city : null,
  };
  const countryId = typeof row.country_id === 'string' && row.country_id ? row.country_id : null;
  const geoAreaId = typeof row.geo_area_id === 'string' && row.geo_area_id ? row.geo_area_id : null;
  if (!countryId) {
    return { source: Object.values(legacy).some(Boolean) ? 'legacy_text' : 'none', countryId: null, countryIso2: null, countryName: legacy.country, geoAreaId: null, ancestors: [], area: null, legacy };
  }

  const country = await loadCountry(client, countryId, false);
  if (!geoAreaId) {
    return { source: 'canonical_country', countryId, countryIso2: country.iso2, countryName: countryLabel(country), geoAreaId: null, ancestors: [], area: null, legacy };
  }
  const chain = (await loadAreaChain(client, geoAreaId, countryId, false)).map(toCanonicalArea);
  return { source: 'canonical', countryId, countryIso2: country.iso2, countryName: countryLabel(country), geoAreaId, ancestors: chain.slice(0, -1), area: chain.at(-1) ?? null, legacy };
}

export async function attachOpportunityGeography<T extends Record<string, unknown>>(
  client: SupabaseClient,
  rows: T[],
): Promise<Array<T & { geography: OpportunityGeographyRead }>> {
  const countryIds = Array.from(new Set(rows.map((row) => typeof row.country_id === 'string' ? row.country_id : null).filter((id): id is string => Boolean(id))));
  const areaIds = Array.from(new Set(rows.map((row) => typeof row.geo_area_id === 'string' ? row.geo_area_id : null).filter((id): id is string => Boolean(id))));
  const countries = new Map<string, CountryRow>();
  if (countryIds.length) {
    const { data, error } = await client
      .from('countries')
      .select('id,iso2,official_name,is_supported,is_active')
      .in('id', countryIds);
    if (error) throw error;
    for (const row of (data ?? []) as CountryRow[]) countries.set(row.id, row);
  }

  const areas = new Map<string, AreaRow>();
  let pending = areaIds;
  for (let depth = 0; pending.length && depth < 16; depth += 1) {
    const ids = pending.filter((id) => !areas.has(id));
    if (!ids.length) break;
    const { data, error } = await client
      .from('geo_areas')
      .select('id,country_id,parent_id,official_name,area_type,level,is_active')
      .in('id', ids);
    if (error) throw error;
    const loaded = (data ?? []) as AreaRow[];
    for (const area of loaded) areas.set(area.id, area);
    pending = Array.from(new Set(
      loaded
        .map((area) => area.parent_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .filter((id) => !areas.has(id)),
    ));
  }

  return rows.map((row) => {
    const legacy = {
      country: typeof row.country === 'string' && row.country.trim() ? row.country : null,
      region: typeof row.region === 'string' && row.region.trim() ? row.region : null,
      province: typeof row.province === 'string' && row.province.trim() ? row.province : null,
      city: typeof row.city === 'string' && row.city.trim() ? row.city : null,
    };
    const countryId = typeof row.country_id === 'string' && row.country_id ? row.country_id : null;
    const geoAreaId = typeof row.geo_area_id === 'string' && row.geo_area_id ? row.geo_area_id : null;
    let geography: OpportunityGeographyRead;
    if (!countryId) {
      geography = { source: Object.values(legacy).some(Boolean) ? 'legacy_text' : 'none', countryId: null, countryIso2: null, countryName: legacy.country, geoAreaId: null, ancestors: [], area: null, legacy };
    } else {
      const country = countries.get(countryId);
      if (!country) throw new OpportunityGeographyError('COUNTRY_NOT_AVAILABLE', 'canonical country is not available');
      if (!geoAreaId) {
        geography = { source: 'canonical_country', countryId, countryIso2: country.iso2, countryName: countryLabel(country), geoAreaId: null, ancestors: [], area: null, legacy };
      } else {
        const reversed: AreaRow[] = [];
        const seen = new Set<string>();
        let cursor: string | null = geoAreaId;
        while (cursor) {
          if (seen.has(cursor) || reversed.length >= 16) throw new OpportunityGeographyError('HIERARCHY_INVALID', 'canonical geography hierarchy is cyclic or too deep');
          seen.add(cursor);
          const area = areas.get(cursor);
          if (!area) throw new OpportunityGeographyError('AREA_NOT_AVAILABLE', 'canonical geo area is not available');
          if (area.country_id !== countryId) throw new OpportunityGeographyError('COUNTRY_AREA_MISMATCH', 'canonical geo area does not belong to country');
          reversed.push(area);
          cursor = area.parent_id;
        }
        const chain = reversed.reverse().map(toCanonicalArea);
        geography = { source: 'canonical', countryId, countryIso2: country.iso2, countryName: countryLabel(country), geoAreaId, ancestors: chain.slice(0, -1), area: chain.at(-1) ?? null, legacy };
      }
    }
    return { ...row, geography };
  });
}

export function opportunityGeographyLabel(geography: OpportunityGeographyRead | undefined | null): string | null {
  if (!geography || (geography.source !== 'canonical' && geography.source !== 'canonical_country')) return null;
  const parts = [...geography.ancestors, ...(geography.area ? [geography.area] : [])]
    .map((area) => area.officialName)
    .reverse();
  if (geography.countryName) parts.push(geography.countryName);
  return parts.filter(Boolean).join(', ') || null;
}
