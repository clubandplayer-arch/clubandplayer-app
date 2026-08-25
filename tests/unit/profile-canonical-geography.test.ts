import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildProfileGeographyDualWrite,
  getProfileGeography,
  resolveProfileResidenceGeography,
  type ProfileGeoArea,
  type ProfileGeographySnapshot,
} from '../../lib/geo/profileGeography';

const migration = readFileSync(new URL('../../supabase/migrations/20261203120000_profile_canonical_geography.sql', import.meta.url), 'utf8');
const readiness = readFileSync(new URL('../../scripts/geo/reports/profile-canonical-geography-readiness.sql', import.meta.url), 'utf8');
const area: ProfileGeoArea = { id: 'area-city', countryId: 'country-it', countryIso2: 'IT', parentId: 'area-province', officialName: 'Carlentini', areaType: 'MUNICIPALITY', level: 3 };
const snapshot = (overrides: Partial<ProfileGeographySnapshot> = {}): ProfileGeographySnapshot => ({ residenceCountryId: null, residenceCountryIso2: null, residenceGeoAreaId: null, residenceArea: null, residenceAncestors: [], openToRelocation: false, countryInterests: [], geoAreaInterests: [], legacy: {}, italyLegacyMappings: [], ...overrides });

test('migration adds nullable canonical residence with direct and same-country foreign keys', () => {
  assert.match(migration, /add column if not exists residence_geo_area_id uuid\s*;/i);
  assert.match(migration, /foreign key \(residence_geo_area_id\)\s*references public\.geo_areas\(id\)/i);
  assert.match(migration, /check \(residence_geo_area_id is null or residence_country_id is not null\)/i);
  assert.match(migration, /foreign key \(residence_geo_area_id, residence_country_id\)\s*references public\.geo_areas\(id, country_id\)/i);
  assert.doesNotMatch(migration, /residence_geo_area_id uuid not null/i);
  assert.match(migration, /profile_preferences_residence_geo_area_idx[\s\S]*residence_geo_area_id/i);
});

test('migration creates unrestricted-by-account profile geo interests and prevents duplicates', () => {
  assert.match(migration, /create table if not exists public\.profile_geo_area_interests/i);
  assert.match(migration, /profile_id uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(migration, /geo_area_id uuid not null references public\.geo_areas\(id\) on delete restrict/i);
  assert.match(migration, /primary key \(profile_id, geo_area_id\)/i);
  assert.match(migration, /priority is null or priority >= 0/i);
  for (const index of ['profile_idx', 'geo_area_idx', 'profile_priority_idx']) assert.match(migration, new RegExp(`profile_geo_area_interests_${index}`));
  assert.doesNotMatch(migration, /account_type|athlete|player/i);
});

test('profile geo interests have owner/admin RLS for every operation', () => {
  assert.match(migration, /alter table public\.profile_geo_area_interests enable row level security/i);
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(migration, new RegExp(`profile_geo_area_interests_${operation}_own_or_admin[\\s\\S]*for ${operation} to authenticated`, 'i'));
  }
  assert.ok((migration.match(/p\.id = profile_geo_area_interests\.profile_id and p\.user_id = auth\.uid\(\)/g) ?? []).length >= 5);
  assert.ok((migration.match(/p\.is_admin = true/g) ?? []).length >= 5);
});

test('canonical residence wins and includes canonical ancestors', () => {
  const province = { ...area, id: 'area-province', parentId: null, officialName: 'Siracusa', areaType: 'PROVINCE', level: 2 };
  const resolved = resolveProfileResidenceGeography(snapshot({ residenceCountryId: 'country-it', residenceCountryIso2: 'IT', residenceGeoAreaId: area.id, residenceArea: area, residenceAncestors: [province], legacy: { city: 'Legacy city' }, italyLegacyMappings: [{ entityType: 'municipality', legacyId: '7', area: { ...area, id: 'other' }, ancestors: [] }] }));
  assert.equal(resolved.source, 'canonical'); assert.equal(resolved.areaId, area.id); assert.deepEqual(resolved.ancestors, [province]);
  assert.equal(resolved.legacyText.city, 'Legacy city');
});

test('Italy fallback selects the most specific legacy mapping without using birth country', () => {
  const legacyWithUnrelatedBirth = { interestRegionId: 1, interestProvinceId: 2, interestMunicipalityId: 3, country: 'Italia', birthCountry: 'FR' };
  const province = { ...area, id: 'province', areaType: 'PROVINCE', level: 2 };
  const resolved = resolveProfileResidenceGeography(snapshot({ legacy: legacyWithUnrelatedBirth, italyLegacyMappings: [{ entityType: 'region', legacyId: '1', area: { ...area, id: 'region', areaType: 'REGION', level: 1 }, ancestors: [] }, { entityType: 'municipality', legacyId: '3', area, ancestors: [province] }] }));
  assert.equal(resolved.source, 'italy_legacy_mapping'); assert.equal(resolved.areaId, area.id); assert.equal(resolved.countryIso2, 'IT'); assert.deepEqual(resolved.ancestors, [province]);
  assert.doesNotMatch(readFileSync(new URL('../../lib/geo/profileGeography.ts', import.meta.url), 'utf8'), /birth_country|birthCountry/);
});

test('unknown legacy residence and interest text is preserved verbatim', () => {
  const legacy = { country: 'Atlantide', region: 'Regione ignota', province: 'Provincia ignota', city: 'Città ignota', interestCountry: 'El Dorado', interestRegion: 'Nord', interestProvince: 'Ovest', interestCity: 'Sconosciuta' };
  const resolved = resolveProfileResidenceGeography(snapshot({ legacy }));
  assert.equal(resolved.source, 'legacy_text'); assert.deepEqual(resolved.legacyText, legacy);
});

test('read layer returns multiple country and geo interests for any profile type', async () => {
  const input = snapshot({ countryInterests: [{ countryId: 'fr', iso2: 'FR', priority: 1 }, { countryId: 'es', iso2: 'ES', priority: 2 }], geoAreaInterests: [{ area, priority: 1 }, { area: { ...area, id: 'area-two' }, priority: 2 }] });
  const result = await getProfileGeography({ load: async (profileId) => { assert.equal(profileId, 'profile-club'); return input; } }, 'profile-club');
  assert.equal(result.countryInterests.length, 2); assert.equal(result.geoAreaInterests.length, 2);
});

test('dual-write foundation prepares canonical and legacy payloads without executing writes', () => {
  const payload = buildProfileGeographyDualWrite('profile-1', { residenceCountryId: 'country-fr', residenceGeoAreaId: 'paris', openToRelocation: true, legacy: { country: 'FR', city: 'Paris', interestCountry: 'ES' }, countryInterests: [{ countryId: 'country-es' }, { countryId: 'country-ch', priority: 2 }], geoAreaInterests: [{ geoAreaId: 'madrid' }, { geoAreaId: 'geneva', priority: 2 }] });
  assert.deepEqual(payload.preferences, { profile_id: 'profile-1', residence_country_id: 'country-fr', residence_geo_area_id: 'paris', open_to_relocation: true });
  assert.equal(payload.legacyProfile?.city, 'Paris'); assert.equal(payload.countryInterests.length, 2); assert.equal(payload.geoAreaInterests.length, 2);
  assert.equal('birth_country' in (payload.legacyProfile ?? {}), false);
});

test('migration and readiness report perform no backfill or protected-domain changes', () => {
  assert.doesNotMatch(migration, /\b(?:insert into|update|delete from)\s+public\./i);
  assert.doesNotMatch(migration, /public\.(?:opportunities|applications|regions|provinces|municipalities|location_children)\b/i);
  assert.doesNotMatch(migration, /municipality_sync_region|profile_location_coerce|location_children\s*\(/i);
  assert.doesNotMatch(readiness, /\b(?:insert|update|delete|alter|create|drop)\b/i);
  assert.match(readiness, /group by account_type, coalesce\(declared_country, 'unknown'\), mapping_status/i);
});

test('readiness classification is conservative for canonical, Italian, foreign, missing-country, textual-only and empty profiles', () => {
  for (const status of ['already_canonical', 'automatically_mappable', 'ambiguous', 'not_mappable', 'no_geography']) assert.match(readiness, new RegExp(status));
  assert.match(readiness, /coalesce\(nullif\(btrim\(pp_country\.iso2\), ''\), nullif\(btrim\(p\.country\), ''\)\) as declared_country/i);
  assert.doesNotMatch(readiness, /coalesce\([^)]*p\.country[^)]*p\.interest_country[^)]*\) as (?:declared_)?country/i);
  assert.match(readiness, /when residence_geo_area_id is not null then 'already_canonical'/i);
  assert.match(readiness, /when upper\(declared_country\) in \('IT', 'ITALIA', 'ITALY'\)[\s\S]*and mapped_geo_area_id is not null[\s\S]*then 'automatically_mappable'/i);
  assert.match(readiness, /when most_specific_legacy_level is not null[\s\S]*declared_country is null or upper\(declared_country\) not in \('IT', 'ITALIA', 'ITALY'\)[\s\S]*then 'ambiguous'/i);
  assert.match(readiness, /when declared_country is not null or has_legacy_text or most_specific_legacy_level is not null[\s\S]*then 'not_mappable'/i);
  assert.match(readiness, /else 'no_geography'/i);
});

test('backfill candidate dry-run is SELECT-only, conservative, detailed and aggregated', () => {
  const report = readFileSync(new URL('../../scripts/geo/reports/profile-canonical-geography-backfill-dry-run.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(report, /\b(?:insert|update|delete|alter|create|drop|truncate|merge)\b/i);
  assert.match(report, /where residence_geo_area_id is null[\s\S]*upper\(declared_country\) in \('IT', 'ITALIA', 'ITALY'\)[\s\S]*coalesce\(municipality_geo_area_id, province_geo_area_id, region_geo_area_id\) is not null/i);
  assert.match(report, /when municipality_geo_area_id is not null then 'safe_municipality_candidate'/i);
  assert.match(report, /when province_geo_area_id is not null then 'province_only_candidate'/i);
  assert.match(report, /when region_geo_area_id is not null then 'region_only_candidate'/i);
  for (const field of ['profile_id', 'account_type', 'display_name', 'legacy_country', 'legacy_region', 'legacy_province', 'legacy_city', 'interest_country', 'interest_region', 'interest_province', 'interest_city', 'interest_region_id', 'interest_province_id', 'interest_municipality_id', 'legacy_level_used', 'mapped_geo_area_id', 'canonical_area_type', 'canonical_official_name', 'canonical_country', 'canonical_ancestors', 'proposed_classification']) assert.match(report, new RegExp(`\\b${field}\\b`, 'i'));
  assert.match(report, /jsonb_agg\([\s\S]*area_type[\s\S]*official_name[\s\S]*order by ancestors\.depth/i);
  assert.match(report, /count\(\*\) over \(partition by account_type, candidate_classification, canonical_area_type\)/i);
  assert.match(report, /'summary'::text[\s\S]*group by account_type, candidate_classification, canonical_area_type/i);
});
