import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MapGeographyContractError,
  normalizeCoordinatePair,
  normalizeMapBounds,
  parseMapViewport,
  resolveCanonicalMapViewport,
  resolveOpportunityMapPlacement,
  resolvePublicMapPoint,
  type MapViewportCatalog,
} from '../../lib/maps/geographyContract';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_COUNTRY_ID = '22222222-2222-4222-8222-222222222222';
const AREA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const IT_BOUNDS = { north: 47.3, south: 35.2, east: 19.2, west: 6 };

function catalog(overrides: Partial<MapViewportCatalog> = {}): MapViewportCatalog {
  return {
    getCountry: async (id) => ({ id, isActive: true, isSupported: true, bounds: IT_BOUNDS }),
    getArea: async (id) => ({ id, countryId: COUNTRY_ID, isActive: true, bounds: { north: 42.1, south: 41.2, east: 13.3, west: 11.4 } }),
    ...overrides,
  };
}

test('coordinate pairs are atomic, numeric and range checked', () => {
  assert.deepEqual(normalizeCoordinatePair({ latitude: '41.9', longitude: 12.5 }), { latitude: 41.9, longitude: 12.5 });
  assert.equal(normalizeCoordinatePair({}), null);
  assert.throws(
    () => normalizeCoordinatePair({ latitude: 41.9 }),
    (error) => error instanceof MapGeographyContractError && error.code === 'COORDINATE_PAIR_INCOMPLETE',
  );
  assert.throws(
    () => normalizeCoordinatePair({ latitude: 91, longitude: 12.5 }),
    (error) => error instanceof MapGeographyContractError && error.code === 'COORDINATE_OUT_OF_RANGE',
  );
});

test('public organization points prefer venue coordinates and keep generic coordinates as legacy fallback', () => {
  assert.deepEqual(resolvePublicMapPoint({
    accountType: 'club',
    venue: { latitude: 45, longitude: 9 },
    legacyProfile: { latitude: 41.9, longitude: 12.5 },
  }), { latitude: 45, longitude: 9, source: 'organization_venue' });
  assert.deepEqual(resolvePublicMapPoint({
    accountType: 'institution',
    venue: {},
    legacyProfile: { latitude: 41.9, longitude: 12.5 },
  }), { latitude: 41.9, longitude: 12.5, source: 'legacy_profile' });
});

test('personal account coordinates never become precise public pins implicitly', () => {
  for (const accountType of ['athlete', 'player', 'staff', 'fan']) {
    assert.equal(resolvePublicMapPoint({
      accountType,
      venue: { latitude: 45, longitude: 9 },
      legacyProfile: { latitude: 41.9, longitude: 12.5 },
    }), null);
  }
});

test('bounds are complete, ordered and antimeridian-aware', () => {
  assert.deepEqual(normalizeMapBounds(IT_BOUNDS), { ...IT_BOUNDS, crossesAntimeridian: false });
  assert.deepEqual(normalizeMapBounds({ north: 20, south: -20, west: 170, east: -170 }), {
    north: 20, south: -20, west: 170, east: -170, crossesAntimeridian: true,
  });
  assert.throws(
    () => normalizeMapBounds({ north: 47, south: 35, east: 19 }),
    (error) => error instanceof MapGeographyContractError && error.code === 'BOUNDS_INCOMPLETE',
  );
  assert.throws(
    () => normalizeMapBounds({ north: 35, south: 47, east: 19, west: 6 }),
    (error) => error instanceof MapGeographyContractError && error.code === 'BOUNDS_INVALID',
  );
});

test('viewport parser accepts matching aliases and rejects partial, conflicting or invalid requests', () => {
  assert.deepEqual(parseMapViewport(new URLSearchParams({ countryId: COUNTRY_ID, country_id: COUNTRY_ID, geoAreaId: AREA_ID })), {
    mode: 'canonical_unvalidated', countryId: COUNTRY_ID, geoAreaId: AREA_ID,
  });
  assert.equal(parseMapViewport(new URLSearchParams()).mode, 'none');
  assert.throws(
    () => parseMapViewport(new URLSearchParams({ north: '47', countryId: COUNTRY_ID })),
    (error) => error instanceof MapGeographyContractError && error.code === 'CONFLICTING_VIEWPORT',
  );
  assert.throws(
    () => parseMapViewport(new URLSearchParams({ geoAreaId: AREA_ID })),
    (error) => error instanceof MapGeographyContractError && error.code === 'COUNTRY_REQUIRED',
  );
  assert.throws(
    () => parseMapViewport(new URLSearchParams({ countryId: 'IT' })),
    (error) => error instanceof MapGeographyContractError && error.code === 'INVALID_COUNTRY_ID',
  );
});

test('explicit bounds produce a spatially strict viewport without canonical IDs', () => {
  assert.deepEqual(parseMapViewport(new URLSearchParams({ north: '47.3', south: '35.2', east: '19.2', west: '6' })), {
    mode: 'bounds', bounds: { ...IT_BOUNDS, crossesAntimeridian: false },
  });
});

test('canonical country and area resolve to catalogue bounds, never centroids', async () => {
  const country = parseMapViewport(new URLSearchParams({ countryId: COUNTRY_ID }));
  assert.equal(country.mode, 'canonical_unvalidated');
  if (country.mode !== 'canonical_unvalidated') return;
  assert.deepEqual(await resolveCanonicalMapViewport(country, catalog()), {
    source: 'canonical_country', countryId: COUNTRY_ID, geoAreaId: null,
    bounds: { ...IT_BOUNDS, crossesAntimeridian: false },
  });

  const area = parseMapViewport(new URLSearchParams({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }));
  assert.equal(area.mode, 'canonical_unvalidated');
  if (area.mode !== 'canonical_unvalidated') return;
  assert.deepEqual((await resolveCanonicalMapViewport(area, catalog())).source, 'canonical_area');
});

test('canonical viewport validation fails closed for unavailable, cross-country and bounds-less records', async () => {
  const parsed = parseMapViewport(new URLSearchParams({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }));
  assert.equal(parsed.mode, 'canonical_unvalidated');
  if (parsed.mode !== 'canonical_unvalidated') return;

  await assert.rejects(
    resolveCanonicalMapViewport(parsed, catalog({ getCountry: async (id) => ({ id, isActive: true, isSupported: false, bounds: IT_BOUNDS }) })),
    (error) => error instanceof MapGeographyContractError && error.code === 'COUNTRY_UNAVAILABLE',
  );
  await assert.rejects(
    resolveCanonicalMapViewport(parsed, catalog({ getArea: async (id) => ({ id, countryId: OTHER_COUNTRY_ID, isActive: true, bounds: IT_BOUNDS }) })),
    (error) => error instanceof MapGeographyContractError && error.code === 'COUNTRY_AREA_MISMATCH',
  );
  await assert.rejects(
    resolveCanonicalMapViewport(parsed, catalog({ getArea: async (id) => ({ id, countryId: COUNTRY_ID, isActive: true, bounds: null }) })),
    (error) => error instanceof MapGeographyContractError && error.code === 'VIEWPORT_BOUNDS_UNAVAILABLE',
  );
});

test('opportunities prefer an explicit venue, then organization venue, and never fabricate an area-centroid pin', () => {
  assert.deepEqual(resolveOpportunityMapPlacement({
    explicitVenue: { latitude: 44, longitude: 8 },
    organizationPoint: { latitude: 45, longitude: 9 },
    canonicalGeoAreaId: AREA_ID,
  }), { latitude: 44, longitude: 8, source: 'opportunity_venue' });
  assert.deepEqual(resolveOpportunityMapPlacement({
    explicitVenue: {}, organizationPoint: { latitude: 45, longitude: 9 }, canonicalGeoAreaId: AREA_ID,
  }), { latitude: 45, longitude: 9, source: 'organization_venue' });
  assert.equal(resolveOpportunityMapPlacement({
    explicitVenue: {}, organizationPoint: null, canonicalGeoAreaId: AREA_ID,
  }), null);
});
