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
  for (const status of ['automatically_mappable', 'ambiguous', 'not_mappable']) assert.match(readiness, new RegExp(status));
  assert.match(readiness, /account_type, country, mapping_status, count\(\*\)/i);
});
