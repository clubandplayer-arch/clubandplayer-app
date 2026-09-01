import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareSearchGeographyRank,
  parseSearchGeography,
  rankSearchGeography,
  resolveCanonicalSearchGeography,
  SearchGeographyContractError,
  type SearchGeographyCatalog,
  type SearchGeographyRankedCandidate,
} from '../../lib/search/canonicalGeographyContract';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_COUNTRY_ID = '22222222-2222-4222-8222-222222222222';
const AREA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CHILD_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function params(values: Record<string, string>) {
  return new URLSearchParams(values);
}

function catalog(overrides: Partial<SearchGeographyCatalog> = {}): SearchGeographyCatalog {
  return {
    getCountry: async (id) => ({ id, isActive: true, isSupported: true }),
    getArea: async (id) => ({ id, countryId: COUNTRY_ID, isActive: true }),
    getActiveDescendantIds: async () => [CHILD_ID, CHILD_ID],
    ...overrides,
  };
}

test('canonical URL parameters accept matching aliases and retain legacy only as fallback evidence', () => {
  const parsed = parseSearchGeography(params({
    countryId: COUNTRY_ID,
    country_id: COUNTRY_ID,
    geoAreaId: AREA_ID,
    country: 'Italia',
    city: 'Roma',
  }));
  assert.deepEqual(parsed, {
    mode: 'canonical_unvalidated',
    countryId: COUNTRY_ID,
    geoAreaId: AREA_ID,
    legacy: { country: 'Italia', region: null, province: null, city: 'Roma' },
  });
});

test('legacy and empty inputs remain explicit when canonical IDs are absent', () => {
  assert.equal(parseSearchGeography(params({ country: 'Italia' })).mode, 'legacy');
  assert.equal(parseSearchGeography(params({})).mode, 'none');
});

test('parser rejects conflicting aliases, invalid UUIDs and area without country', () => {
  assert.throws(
    () => parseSearchGeography(params({ countryId: COUNTRY_ID, country_id: OTHER_COUNTRY_ID })),
    (error) => error instanceof SearchGeographyContractError && error.code === 'CONFLICTING_ALIAS',
  );
  assert.throws(
    () => parseSearchGeography(params({ countryId: 'IT' })),
    (error) => error instanceof SearchGeographyContractError && error.code === 'INVALID_COUNTRY_ID',
  );
  assert.throws(
    () => parseSearchGeography(params({ geoAreaId: AREA_ID })),
    (error) => error instanceof SearchGeographyContractError && error.code === 'COUNTRY_REQUIRED',
  );
});

test('catalog validation accepts country-only and expands one area to unique active descendants', async () => {
  const countryOnly = parseSearchGeography(params({ countryId: COUNTRY_ID }));
  assert.equal(countryOnly.mode, 'canonical_unvalidated');
  if (countryOnly.mode !== 'canonical_unvalidated') return;
  assert.deepEqual(await resolveCanonicalSearchGeography(countryOnly, catalog()), {
    mode: 'canonical', countryId: COUNTRY_ID, geoAreaId: null, areaIds: [],
  });

  const full = parseSearchGeography(params({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }));
  assert.equal(full.mode, 'canonical_unvalidated');
  if (full.mode !== 'canonical_unvalidated') return;
  assert.deepEqual(await resolveCanonicalSearchGeography(full, catalog()), {
    mode: 'canonical', countryId: COUNTRY_ID, geoAreaId: AREA_ID, areaIds: [AREA_ID, CHILD_ID],
  });
});

test('catalog validation fails closed for unsupported countries and cross-country areas', async () => {
  const parsed = parseSearchGeography(params({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }));
  assert.equal(parsed.mode, 'canonical_unvalidated');
  if (parsed.mode !== 'canonical_unvalidated') return;
  await assert.rejects(
    resolveCanonicalSearchGeography(parsed, catalog({ getCountry: async (id) => ({ id, isActive: true, isSupported: false }) })),
    (error) => error instanceof SearchGeographyContractError && error.code === 'COUNTRY_UNAVAILABLE',
  );
  await assert.rejects(
    resolveCanonicalSearchGeography(parsed, catalog({ getArea: async (id) => ({ id, countryId: OTHER_COUNTRY_ID, isActive: true }) })),
    (error) => error instanceof SearchGeographyContractError && error.code === 'COUNTRY_AREA_MISMATCH',
  );
});

test('ranking uses one strongest geography reason and keeps legacy profiles competitive', () => {
  assert.deepEqual(rankSearchGeography({ canonicalAreaMatch: true, canonicalCountryMatch: true, sportMatch: true }), {
    score: 640,
    reasons: ['canonical_area', 'sport'],
  });
  assert.deepEqual(rankSearchGeography({ legacyAreaMatch: true, sportMatch: true }), {
    score: 240,
    reasons: ['legacy_area', 'sport'],
  });
  assert.deepEqual(rankSearchGeography({}), { score: 0, reasons: [] });
});

test('relocation is an additive reviewed signal and never an implicit eligibility filter', () => {
  assert.deepEqual(rankSearchGeography({ relocationCompatible: true }), {
    score: 20,
    reasons: ['relocation_compatible'],
  });
  assert.deepEqual(rankSearchGeography({ relocationCompatible: false }), { score: 0, reasons: [] });
});

test('candidate order is deterministic by score, priority, recency and ID', () => {
  const candidates: SearchGeographyRankedCandidate[] = [
    { id: 'b', score: 100, reasons: ['legacy_country'], interestPriority: 2, updatedAt: '2026-01-01' },
    { id: 'c', score: 200, reasons: ['legacy_area'], interestPriority: null, updatedAt: '2025-01-01' },
    { id: 'a', score: 100, reasons: ['legacy_country'], interestPriority: 1, updatedAt: '2024-01-01' },
  ];
  assert.deepEqual(candidates.sort(compareSearchGeographyRank).map((item) => item.id), ['c', 'a', 'b']);
});
