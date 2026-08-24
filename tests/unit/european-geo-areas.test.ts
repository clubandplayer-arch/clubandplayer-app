import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import {
  normalizeGeoImportRecord,
  validateGeoHierarchyRecord,
  validateGeoImportBatch,
} from '../../lib/geo/canonical';

const migrationName = '20260824120000_european_geo_area_foundation.sql';
const migrationPath = new URL(`../../supabase/migrations/${migrationName}`, import.meta.url);
const migrationSql = readFileSync(migrationPath, 'utf8');
const migrationsDir = new URL('../../supabase/migrations/', import.meta.url);

test('migration creates the empty canonical geography schema and country/parent foreign keys', () => {
  for (const table of ['geo_areas', 'geo_area_names', 'legacy_geo_area_mappings']) {
    assert.match(migrationSql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
    assert.match(migrationSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(migrationSql, /country_id uuid not null references public\.countries\(id\) on delete restrict/i);
  assert.match(migrationSql, /foreign key \(parent_id, country_id\)[\s\S]*references public\.geo_areas\(id, country_id\)/i);
  assert.match(migrationSql, /parent_id is null or parent_id <> id/i);
  assert.match(migrationSql, /level >= 1/i);
});

test('migration validates coordinates, complete ordered bounds and extensible area type codes', () => {
  assert.match(migrationSql, /centroid_lat is null or centroid_lat between -90 and 90/i);
  assert.match(migrationSql, /centroid_lng is null or centroid_lng between -180 and 180/i);
  assert.match(migrationSql, /min_lat is not null and min_lng is not null and max_lat is not null and max_lng is not null/i);
  assert.match(migrationSql, /min_lat <= max_lat and min_lng <= max_lng/i);
  assert.match(migrationSql, /area_type ~ '\^\[A-Z\]\[A-Z0-9_\]\*\$'/i);
  assert.doesNotMatch(migrationSql, /create\s+type[\s\S]+enum/i);
  assert.doesNotMatch(migrationSql, /postgis|create\s+extension/i);
});

test('migration defines provider, administrative-code, localized-name and legacy-mapping uniqueness', () => {
  assert.match(migrationSql, /unique index if not exists geo_areas_provider_record_key[\s\S]*source_provider, source_record_id/i);
  assert.match(migrationSql, /unique index if not exists geo_areas_country_authority_code_key[\s\S]*country_id, code_authority, code/i);
  assert.match(migrationSql, /unique index if not exists geo_area_names_preferred_key[\s\S]*geo_area_id, locale/i);
  assert.match(migrationSql, /unique \(source_system, source_entity_type, legacy_id\)/i);
  assert.match(migrationSql, /geo_area_id uuid not null references public\.geo_areas\(id\) on delete cascade/i);
});

test('catalogues are publicly readable, mappings are authenticated-only, and writes are admin protected', () => {
  assert.match(migrationSql, /geo_areas_catalog_read[\s\S]*for select to anon, authenticated using \(true\)/i);
  assert.match(migrationSql, /geo_area_names_catalog_read[\s\S]*for select to anon, authenticated using \(true\)/i);
  assert.match(migrationSql, /legacy_geo_area_mappings_authenticated_read[\s\S]*for select to authenticated using \(true\)/i);
  assert.doesNotMatch(migrationSql, /legacy_geo_area_mappings[^;]*for select to anon/i);
  assert.match(migrationSql, /p\.user_id = auth\.uid\(\) and p\.is_admin = true/i);
});

test('updated_at trigger is scoped to geo_areas and reuses the existing function', () => {
  assert.match(migrationSql, /create trigger trg_geo_areas_updated_at\s+before update on public\.geo_areas[\s\S]*execute function public\.set_current_timestamp_updated_at\(\)/i);
  assert.doesNotMatch(migrationSql, /create(?:\s+or\s+replace)?\s+function\s+public\.set_current_timestamp_updated_at/i);
});

test('normalization is provider-independent and performs no runtime provider access', () => {
  const normalized = normalizeGeoImportRecord({
    provider: 'official-fr', externalId: ' 11 ', countryIso2: 'fr', parentExternalId: null,
    code: 'IDF', codeAuthority: 'INSEE', officialName: ' Île-de-France ', areaType: 'administrative region',
    level: '1', coordinates: { lat: '48.85', lng: 2.35 },
    bounds: { minLat: 48, minLng: 1.4, maxLat: 49.3, maxLng: 3.6 },
    metadata: { attribution: 'official' }, sourceLicense: 'open-data',
  });
  assert.equal(normalized.provider, 'official-fr');
  assert.equal(normalized.externalId, '11');
  assert.equal(normalized.countryIso2, 'FR');
  assert.equal(normalized.areaType, 'ADMINISTRATIVE_REGION');
  assert.deepEqual(normalized.coordinates, { lat: 48.85, lng: 2.35 });
  assert.equal(validateGeoHierarchyRecord(normalized).valid, true);

  const source = readFileSync(new URL('../../lib/geo/canonical.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|axios|countrystatecity|country-state-city/i);
});

test('record and batch validation reject invalid hierarchy, parent country mismatch and cycles', () => {
  const base = normalizeGeoImportRecord({ provider: 'manual', externalId: 'root', countryIso2: 'IT', officialName: 'Root', areaType: 'REGION', level: 1 });
  const child = normalizeGeoImportRecord({ provider: 'manual', externalId: 'child', parentExternalId: 'root', countryIso2: 'IT', officialName: 'Child', areaType: 'PROVINCE', level: 2 });
  assert.equal(validateGeoImportBatch([base, child]).valid, true);

  const wrongCountry = { ...child, countryIso2: 'FR' };
  assert.ok(validateGeoImportBatch([base, wrongCountry]).errors.includes('child:parent_country_mismatch'));

  const selfParent = { ...base, parentExternalId: 'root' };
  assert.ok(validateGeoHierarchyRecord(selfParent).errors.includes('self_parent'));

  const cycleA = { ...base, externalId: 'a', parentExternalId: 'b' };
  const cycleB = { ...child, externalId: 'b', parentExternalId: 'a' };
  assert.ok(validateGeoImportBatch([cycleA, cycleB]).errors.some((error) => error.endsWith(':cycle_detected')));
});

test('invalid coordinates, bounds, level and source pairs are rejected by schema or normalization validation', () => {
  const invalid = normalizeGeoImportRecord({
    provider: 'manual', externalId: 'bad', countryIso2: 'IT', officialName: 'Bad', areaType: 'REGION', level: 0,
    coordinates: { lat: 91, lng: -181 }, bounds: { minLat: 10, minLng: 20, maxLat: 5, maxLng: 15 },
    code: 'X', codeAuthority: null,
  });
  assert.deepEqual(validateGeoHierarchyRecord(invalid).errors.sort(), [
    'bounds_lat_invalid', 'bounds_lng_invalid', 'centroid_lat_invalid', 'centroid_lng_invalid',
    'code_authority_pair_invalid', 'level_invalid',
  ]);
});

test('migration contains no seeds, legacy changes, profile relations, map changes or previous migration edits', () => {
  assert.doesNotMatch(migrationSql, /(?:insert\s+into|update|delete\s+from)\s+public\./i);
  assert.doesNotMatch(migrationSql, /alter\s+table\s+(?:if\s+exists\s+)?public\.(regions|provinces|municipalities|profiles|profile_preferences|opportunities|applications)\b/i);
  assert.doesNotMatch(migrationSql, /location_children|municipality_sync_region|profile_location_coerce|set_profile_visibility_status/i);
  assert.doesNotMatch(migrationSql, /players_view|athletes_view|clubs_view|residence_geo_area_id|profile_geo_area_interests|profile_organization_locations|opportunity_geo_area_id/i);
  assert.doesNotMatch(migrationSql, /club_stadium_lat|club_stadium_lng|latitude|longitude/i);

  const names = readdirSync(migrationsDir).filter((name) => name.includes('european_geo_area_foundation'));
  assert.deepEqual(names, [migrationName]);
});

test('generic read API validates canonical filters and does not replace legacy geo routes', () => {
  const route = readFileSync(new URL('../../app/api/geo/areas/route.ts', import.meta.url), 'utf8');
  assert.match(route, /searchParams\.get\('country'\)/);
  assert.match(route, /searchParams\.get\('parentId'\)/);
  assert.match(route, /searchParams\.get\('level'\)/);
  assert.match(route, /searchParams\.get\('active'\)/);
  assert.match(route, /getGeoAreas\(supabase/);
  assert.doesNotMatch(route, /fetch\s*\(|country.?state.?city|geonames/i);

  for (const legacyRoute of ['regions', 'provinces', 'municipalities']) {
    const source = readFileSync(new URL(`../../app/api/geo/${legacyRoute}/route.ts`, import.meta.url), 'utf8');
    assert.ok(source.length > 0);
  }
});
