import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applyOrganizationMapBounds, applyOrganizationMapLocationScope, resolveCanonicalMapLocationScope, resolveMapViewportFromParams } from '../../lib/maps/geography.server';
import type { MapViewportCatalog } from '../../lib/maps/geographyContract';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';
const AREA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROOT_AREA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROVINCE_AREA_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function geographyClient(countryIso2: string, areas: Array<{ id: string; parentId: string | null; name: string; type: string; localizedNames?: string[]; legacyNames?: Array<string | null> }>, aliases: string[] = [countryIso2]) {
  const rows = new Map(areas.map((area) => [area.id, {
    id: area.id,
    country_id: COUNTRY_ID,
    parent_id: area.parentId,
    official_name: area.name,
    short_name: null,
    area_type: area.type,
    is_active: true,
  }]));
  return {
    from(table: string) {
      let id = '';
      let geoAreaId = '';
      const query = {
        select() { return query; },
        eq(column: string, value: string) {
          if (column === 'id') id = value;
          if (column === 'geo_area_id') geoAreaId = value;
          return query;
        },
        not() { return query; },
        async maybeSingle() {
          return table === 'countries'
            ? { data: { id: COUNTRY_ID, iso2: countryIso2, is_active: true, is_supported: true }, error: null }
            : { data: rows.get(id) ?? null, error: null };
        },
        then(resolve: (value: unknown) => unknown) {
          const area = areas.find((candidate) => candidate.id === geoAreaId);
          const result = table === 'legacy_country_mappings'
            ? { data: aliases.map((source_value) => ({ source_value })), error: null }
            : table === 'geo_area_names'
              ? { data: (area?.localizedNames ?? []).map((name) => ({ name })), error: null }
              : table === 'legacy_geo_area_mappings'
                ? { data: (area?.legacyNames ?? []).map((legacy_value) => ({ legacy_value })), error: null }
                : null;
          return Promise.resolve(result).then(resolve);
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
  const orFilters: string[] = [];
  const query = {
    or(value: string) {
      orFilters.push(value);
      return this;
    },
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
    countryAliases: ['IT', 'Italia', 'Italy'],
    region: 'Lazio',
    regionAliases: ['Lazio'],
    province: 'Roma',
    provinceAliases: ['Roma'],
    city: 'Roma',
    cityAliases: ['Roma'],
  }), query);
  assert.equal(orFilters[0], 'country.ilike."IT",country.ilike."Italia",country.ilike."Italy"');
  assert.match(orFilters[1], /region\.ilike\."Lazio"/);
  assert.match(orFilters[2], /province\.ilike\."Roma"/);
  assert.match(orFilters[3], /city\.ilike\."Roma"/);
  assert.match(orFilters[4], /club_stadium_lat\.gte\.-90/);
  assert.deepEqual(filters, []);
});

test('bounds-less European canonical area types map to their legacy location fields', async () => {
  const cases = [
    { country: 'FR', areas: [[ROOT_AREA_ID, null, 'Île-de-France', 'REGION'], [AREA_ID, ROOT_AREA_ID, 'Paris', 'DEPARTMENT']], expected: ['Île-de-France', null, null] },
    { country: 'ES', areas: [[AREA_ID, null, 'Madrid, Comunidad de', 'AUTONOMOUS_COMMUNITY']], expected: ['Madrid, Comunidad de', null, null] },
    { country: 'CH', areas: [[ROOT_AREA_ID, null, 'Ticino', 'CANTON'], [AREA_ID, ROOT_AREA_ID, 'Lugano', 'DISTRICT']], expected: ['Ticino', null, null] },
    { country: 'SI', areas: [[AREA_ID, null, 'Osrednjeslovenska', 'STATISTICAL_REGION']], expected: ['Osrednjeslovenska', null, null] },
    { country: 'PL', areas: [[ROOT_AREA_ID, null, 'Mazowieckie', 'VOIVODESHIP'], [PROVINCE_AREA_ID, ROOT_AREA_ID, 'Warszawa', 'POWIAT'], [AREA_ID, PROVINCE_AREA_ID, 'Warszawa', 'GMINA']], expected: ['Mazowieckie', null, 'Warszawa'] },
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

test('bounds-less foreign Club scopes do not require null province fields and use canonical legacy country aliases', async () => {
  const cases = [
    { iso2: 'IT', aliases: ['IT', 'Italia', 'Italy'], expectedAliases: ['Italia', 'Italy'] },
    { iso2: 'FR', aliases: ['FR', 'France', 'Francia'], expectedAliases: ['France', 'Francia'] },
  ];
  for (const item of cases) {
    const areas = [
      { id: ROOT_AREA_ID, parentId: null, name: item.iso2 === 'IT' ? 'Lazio' : 'Île-de-France', type: 'REGION' },
      { id: AREA_ID, parentId: ROOT_AREA_ID, name: item.iso2 === 'IT' ? 'Roma' : 'Paris', type: item.iso2 === 'IT' ? 'PROVINCE' : 'DEPARTMENT' },
    ];
    const scope = await resolveCanonicalMapLocationScope(
      new URLSearchParams({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }),
      geographyClient(item.iso2, areas, item.aliases) as never,
    );
    assert.deepEqual(scope.countryAliases, item.aliases);
    assert.equal(scope.province, item.iso2 === 'IT' ? 'Roma' : null);

    const orFilters: string[] = [];
    const locationFilters: Array<[string, string]> = [];
    applyOrganizationMapLocationScope({
      or(value: string) { orFilters.push(value); return this; },
      ilike(column: string, value: string) { locationFilters.push([column, value]); return this; },
    }, scope);
    for (const alias of item.expectedAliases) assert.match(orFilters[0], new RegExp(`country\\.ilike\\."${alias}"`));
    if (item.iso2 === 'FR') assert.doesNotMatch(JSON.stringify(locationFilters), /province/i);
  }
});

test('localized and legacy area aliases filter free-text cities without requiring the canonical spelling', async () => {
  const areas = [
    { id: ROOT_AREA_ID, parentId: null, name: 'Île-de-France', type: 'REGION', localizedNames: ['Ile-de-France'], legacyNames: [null] },
    { id: AREA_ID, parentId: ROOT_AREA_ID, name: 'Paris', type: 'COMMUNE', localizedNames: ['Parigi'], legacyNames: ['PARIS'] },
  ];
  const scope = await resolveCanonicalMapLocationScope(
    new URLSearchParams({ countryId: COUNTRY_ID, geoAreaId: AREA_ID }),
    geographyClient('FR', areas, ['FR', 'France', 'Francia']) as never,
  );
  assert.deepEqual(scope.cityAliases, ['Paris', 'Parigi', 'PARIS']);
  const expressions: string[] = [];
  applyOrganizationMapLocationScope({ or(value: string) { expressions.push(value); return this; } }, scope);
  assert.match(expressions.find((value) => value.includes('city.ilike')) ?? '', /city\.ilike\."Paris",city\.ilike\."Parigi",city\.ilike\."PARIS"/);
});

test('coordinate eligibility is applied in SQL before the caller limit', () => {
  const calls: string[] = [];
  const query = {
    or(value: string) { calls.push(`or:${value}`); return this; },
    limit(value: number) { calls.push(`limit:${value}`); return this; },
  };
  const filtered = applyOrganizationMapLocationScope(query, {
    source: 'canonical_text_filter', countryId: COUNTRY_ID, geoAreaId: null,
    countryIso2: 'FR', countryAliases: ['FR', 'France'],
    region: null, regionAliases: [], province: null, provinceAliases: [], city: null, cityAliases: [],
  });
  filtered.limit(51);
  assert.match(calls.at(-2) ?? '', /club_stadium_lat\.gte\.-90.*latitude\.gte\.-90/);
  assert.equal(calls.at(-1), 'limit:51');
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
