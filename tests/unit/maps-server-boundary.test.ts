import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applyOrganizationMapBounds, applyOrganizationMapLocationScope, resolveCanonicalMapLocationScope, resolveMapViewportFromParams } from '../../lib/maps/geography.server';
import type { MapViewportCatalog } from '../../lib/maps/geographyContract';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';
const AREA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROOT_AREA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROVINCE_AREA_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function geographyClient(countryIso2: string, areas: Array<{ id: string; parentId: string | null; name: string; type: string }>) {
  const rows = new Map(areas.map((area) => [area.id, {
    id: area.id,
    country_id: COUNTRY_ID,
    parent_id: area.parentId,
    official_name: area.name,
    area_type: area.type,
    is_active: true,
  }]));
  return {
    from(table: string) {
      let id = '';
      const query = {
        select() { return query; },
        eq(column: string, value: string) {
          if (column === 'id') id = value;
          return query;
        },
        async maybeSingle() {
          return table === 'countries'
            ? { data: { id: COUNTRY_ID, iso2: countryIso2, is_active: true, is_supported: true }, error: null }
            : { data: rows.get(id) ?? null, error: null };
        },
      };
      return query;
    },
  };
}

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

test('bounds-less canonical areas narrow legacy Club location columns instead of widening globally', () => {
  const filters: Array<[string, string]> = [];
  const query = {
    ilike(column: string, value: string) {
      filters.push([column, value]);
      return this;
    },
  };
  assert.equal(applyOrganizationMapLocationScope(query, {
    source: 'canonical_text_filter',
    countryId: COUNTRY_ID,
    geoAreaId: AREA_ID,
    countryIso2: 'IT',
    region: 'Lazio',
    province: 'Roma',
    city: 'Roma',
  }), query);
  assert.deepEqual(filters, [
    ['country', 'IT'],
    ['region', 'Lazio'],
    ['province', 'Roma'],
    ['city', 'Roma'],
  ]);
});

test('bounds-less European canonical area types map to their legacy location fields', async () => {
  const cases = [
    { country: 'FR', areas: [[ROOT_AREA_ID, null, 'Île-de-France', 'REGION'], [AREA_ID, ROOT_AREA_ID, 'Paris', 'DEPARTMENT']], expected: ['Île-de-France', 'Paris', null] },
    { country: 'ES', areas: [[AREA_ID, null, 'Madrid, Comunidad de', 'AUTONOMOUS_COMMUNITY']], expected: ['Madrid, Comunidad de', null, null] },
    { country: 'CH', areas: [[ROOT_AREA_ID, null, 'Ticino', 'CANTON'], [AREA_ID, ROOT_AREA_ID, 'Lugano', 'DISTRICT']], expected: ['Ticino', 'Lugano', null] },
    { country: 'SI', areas: [[AREA_ID, null, 'Osrednjeslovenska', 'STATISTICAL_REGION']], expected: ['Osrednjeslovenska', null, null] },
    { country: 'PL', areas: [[ROOT_AREA_ID, null, 'Mazowieckie', 'VOIVODESHIP'], [PROVINCE_AREA_ID, ROOT_AREA_ID, 'Warszawa', 'POWIAT'], [AREA_ID, PROVINCE_AREA_ID, 'Warszawa', 'GMINA']], expected: ['Mazowieckie', 'Warszawa', 'Warszawa'] },
  ] as const;

  for (const item of cases) {
    const areas = item.areas.map(([id, parentId, name, type]) => ({ id, parentId, name, type }));
    const selected = areas.at(-1)!;
    const scope = await resolveCanonicalMapLocationScope(
      new URLSearchParams({ countryId: COUNTRY_ID, geoAreaId: selected.id }),
      geographyClient(item.country, areas) as never,
    );
    assert.deepEqual([scope.region, scope.province, scope.city], item.expected, item.country);
  }
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
  assert.match(searchMap, /clubQuery\.limit\(PUBLIC_MAP_LIMITS\.searchOwnerPool\)/);
  assert.match(geolocated, /resolveCanonicalMapLocationScope/);
  assert.match(geolocated, /applyOrganizationMapLocationScope/);
});

test('E5 consolidates the legacy SearchMap route onto the safe ClubMap surface', () => {
  const searchMapPage = readFileSync('app/(dashboard)/search-map/page.tsx', 'utf8');
  assert.match(searchMapPage, /redirect\('\/club-map'\)/);
  const serverAdapter = readFileSync('lib/maps/geography.server.ts', 'utf8');
  assert.doesNotMatch(serverAdapter, /service_role|insert\(|update\(|delete\(|rpc\(/i);
});

test('E6 opportunity map rows use explicit placement semantics and canonical geography only as metadata', () => {
  const searchMap = readFileSync('app/api/search/map/route.ts', 'utf8');
  assert.match(searchMap, /resolveOpportunityMapPlacement/);
  assert.match(searchMap, /attachOpportunityGeography/);
  assert.match(searchMap, /country_id/);
  assert.match(searchMap, /geo_area_id/);
  assert.match(searchMap, /map_semantics: 'owner_public_point'/);
  assert.match(searchMap, /canonical_geography_is_viewport_only: true/);
  assert.match(searchMap, /placementContract: 'opportunity_owner_public_point_v1'/);
  assert.match(searchMap, /if \(!placement\) return \[\]/);
  assert.match(searchMap, /select\('id, user_id, account_type/);
  assert.match(searchMap, /clubOwnerIds/);
  assert.match(searchMap, /created_by\.in/);
  assert.match(searchMap, /\[o\.club_id, o\.owner_id, o\.created_by\]/);
});
