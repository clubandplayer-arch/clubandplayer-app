import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applyOrganizationMapBounds, resolveMapViewportFromParams } from '../../lib/maps/geography.server';
import type { MapViewportCatalog } from '../../lib/maps/geographyContract';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';
const AREA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('database bounds preserve venue precedence and include stadium-only organizations', () => {
  let expression = '';
  const query = {
    or(value: string) {
      expression = value;
      return this;
    },
  };
  assert.equal(applyOrganizationMapBounds(query, {
    north: 47, south: 35, east: 19, west: 6, crossesAntimeridian: false,
  }), query);
  assert.match(expression, /club_stadium_lat\.gte\.35/);
  assert.match(expression, /club_stadium_lng\.lte\.19/);
  assert.match(expression, /club_stadium_lat\.is\.null,club_stadium_lng\.is\.null,latitude\.gte\.35/);
});

test('database bounds split antimeridian longitude ranges without dropping venue precedence', () => {
  let expression = '';
  const query = { or(value: string) { expression = value; return this; } };
  applyOrganizationMapBounds(query, {
    north: 20, south: -20, east: -170, west: 170, crossesAntimeridian: true,
  });
  assert.match(expression, /club_stadium_lng\.gte\.170,club_stadium_lng\.lte\.180/);
  assert.match(expression, /club_stadium_lng\.gte\.-180,club_stadium_lng\.lte\.-170/);
});

test('server viewport adapter supports explicit and canonical scopes without descendant fan-out', async () => {
  const catalog: MapViewportCatalog = {
    getCountry: async (id) => ({ id, isActive: true, isSupported: true, bounds: { north: 47, south: 35, east: 19, west: 6 } }),
    getArea: async (id) => ({ id, countryId: COUNTRY_ID, isActive: true, bounds: { north: 42, south: 41, east: 13, west: 11 } }),
  };
  const explicit = await resolveMapViewportFromParams(new URLSearchParams({ north: '47', south: '35', east: '19', west: '6' }), catalog);
  assert.equal(explicit?.source, 'explicit_bounds');
  const canonical = await resolveMapViewportFromParams(new URLSearchParams({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }), catalog);
  assert.deepEqual(canonical && { source: canonical.source, countryId: canonical.countryId, geoAreaId: canonical.geoAreaId }, {
    source: 'canonical_area', countryId: COUNTRY_ID, geoAreaId: AREA_ID,
  });
});

test('all map endpoints share the E3 resolver, strict bounds and organization-only public point contract', () => {
  const geolocated = readFileSync('app/api/clubs/geolocated/route.ts', 'utf8');
  const bounds = readFileSync('app/api/search/clubs-in-bounds/route.ts', 'utf8');
  const searchMap = readFileSync('app/api/search/map/route.ts', 'utf8');
  for (const source of [geolocated, bounds, searchMap]) {
    assert.match(source, /resolveMapViewportFromParams/);
    assert.match(source, /applyOrganizationMapBounds/);
    assert.match(source, /resolvePublicMapPoint/);
    assert.match(source, /MapGeographyContractError/);
    assert.match(source, /invalidPayload/);
  }
  assert.match(searchMap, /precise_personal_map_points_disabled/);
  assert.doesNotMatch(searchMap, /fallbackQuery/);
  assert.match(searchMap, /clubQuery\.limit\(300\)/);
});

test('E3 changes no SearchMap route activation, migration, RLS or client provider code', () => {
  const searchMapPage = readFileSync('app/(dashboard)/search-map/page.tsx', 'utf8');
  assert.match(searchMapPage, /redirect\('\/search'\)/);
  const serverAdapter = readFileSync('lib/maps/geography.server.ts', 'utf8');
  assert.doesNotMatch(serverAdapter, /service_role|insert\(|update\(|delete\(|rpc\(/i);
});
