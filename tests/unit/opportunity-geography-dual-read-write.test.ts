import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildOpportunityGeographyWritePlan,
  OpportunityGeographyError,
  opportunityGeographyLabel,
  parseOpportunityGeographyCommand,
  projectOpportunityLegacyGeography,
} from '../../lib/opportunities/geography';

const ids = {
  country: '10000000-0000-4000-8000-000000000001',
  area: '20000000-0000-4000-8000-000000000001',
};

const read = (path: string) => readFileSync(path, 'utf8');

function geographyClient() {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    countries: [{ id: ids.country, iso2: 'SI', official_name: 'Slovenia', is_supported: true, is_active: true }],
    geo_areas: [
      { id: '30000000-0000-4000-8000-000000000001', country_id: ids.country, parent_id: null, official_name: 'Osrednjeslovenska', area_type: 'STATISTICAL_REGION', level: 1, is_active: true },
      { id: ids.area, country_id: ids.country, parent_id: '30000000-0000-4000-8000-000000000001', official_name: 'Ljubljana', area_type: 'MUNICIPALITY', level: 2, is_active: true },
    ],
  };
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) { rows = rows.filter((row) => row[column] === value); return query; },
        async maybeSingle() { return { data: rows[0] ?? null, error: null }; },
      };
      return query;
    },
  } as any;
}

test('Opportunity geography command distinguishes absent, legacy, reset, country-only and full', () => {
  assert.deepEqual(parseOpportunityGeographyCommand({ title: 'No geography' }), { kind: 'absent' });
  assert.deepEqual(parseOpportunityGeographyCommand({ country: 'Italia', city: 'Roma' }), { kind: 'legacy' });
  assert.deepEqual(parseOpportunityGeographyCommand({ country_id: null, geo_area_id: null }), { kind: 'reset' });
  assert.deepEqual(parseOpportunityGeographyCommand({ countryId: ids.country }), {
    kind: 'country_only', countryId: ids.country,
  });
  assert.deepEqual(parseOpportunityGeographyCommand({ country_id: ids.country, geo_area_id: ids.area }), {
    kind: 'full', countryId: ids.country, geoAreaId: ids.area,
  });
});

test('Opportunity geography command rejects area without country and malformed UUIDs', () => {
  assert.throws(
    () => parseOpportunityGeographyCommand({ geo_area_id: ids.area }),
    (error) => error instanceof OpportunityGeographyError && error.code === 'INVALID_GEOGRAPHY',
  );
  assert.throws(
    () => parseOpportunityGeographyCommand({ country_id: 'IT' }),
    (error) => error instanceof OpportunityGeographyError && error.code === 'INVALID_GEOGRAPHY',
  );
});

test('legacy projection supports heterogeneous launch-country hierarchies', () => {
  const country = { id: ids.country, iso2: 'CH', official_name: 'Switzerland', is_supported: true, is_active: true };
  const projected = projectOpportunityLegacyGeography(country, [
    { id: 'canton', countryId: ids.country, parentId: null, officialName: 'Ticino', areaType: 'CANTON', level: 1 },
    { id: 'city', countryId: ids.country, parentId: 'canton', officialName: 'Lugano', areaType: 'MUNICIPALITY', level: 2 },
  ]);
  assert.deepEqual(projected, { country: 'Svizzera', region: 'Ticino', province: null, city: 'Lugano' });

  assert.throws(
    () => projectOpportunityLegacyGeography(country, [
      { id: 'unknown', countryId: ids.country, parentId: null, officialName: 'Unknown', areaType: 'UNKNOWN', level: 1 },
    ]),
    (error) => error instanceof OpportunityGeographyError && error.code === 'UNSUPPORTED_AREA_TYPE',
  );
});

test('canonical write planning validates the server catalogue and projects one atomic row payload', async () => {
  const plan = await buildOpportunityGeographyWritePlan(geographyClient(), {
    kind: 'full', countryId: ids.country, geoAreaId: ids.area,
  });
  assert.deepEqual(plan, {
    country_id: ids.country,
    geo_area_id: ids.area,
    country: 'Slovenia',
    region: 'Osrednjeslovenska',
    province: null,
    city: 'Ljubljana',
  });
});

test('canonical display wins while legacy and unavailable reads remain explicit', () => {
  const canonical = {
    source: 'canonical' as const,
    countryId: ids.country,
    countryIso2: 'FR',
    countryName: 'Francia',
    geoAreaId: ids.area,
    ancestors: [
      { id: 'root', countryId: ids.country, parentId: null, officialName: 'Île-de-France', areaType: 'REGION', level: 1 },
    ],
    area: { id: ids.area, countryId: ids.country, parentId: 'root', officialName: 'Paris', areaType: 'COMMUNE', level: 2 },
    legacy: { country: 'France', region: null, province: null, city: 'Old Paris' },
  };
  assert.equal(opportunityGeographyLabel(canonical), 'Paris, Île-de-France, Francia');
  assert.equal(opportunityGeographyLabel({ ...canonical, source: 'legacy_text' }), null);
});

test('collection and item APIs implement canonical reads and field-aware dual writes', () => {
  const collection = read('app/api/opportunities/route.ts');
  const item = read('app/api/opportunities/[id]/route.ts');
  const repository = read('lib/data/opportunities.ts');

  for (const source of [collection, item, repository]) {
    assert.match(source, /country_id\s*,\s*geo_area_id/);
  }
  assert.match(collection, /parseOpportunityGeographyCommand/);
  assert.match(collection, /buildOpportunityGeographyWritePlan/);
  assert.match(collection, /attachOpportunityGeography/);
  assert.match(item, /geographyCommand\.kind === 'legacy'[\s\S]*clearCanonicalOpportunityGeography/);
  assert.match(item, /geographyCommand\.kind !== 'absent'[\s\S]*buildOpportunityGeographyWritePlan/);
  assert.match(item, /resolveOpportunityGeography/);
});

test('dual-read reaches detail, Search, feed, owner and application surfaces', () => {
  const targets = [
    'app/(dashboard)/opportunities/[id]/page.tsx',
    'app/api/search/route.ts',
    'app/api/feed/highlights/route.ts',
    'app/api/opportunities/mine/route.ts',
    'app/api/applications/received/route.ts',
  ];
  for (const target of targets) {
    const source = read(target);
    assert.match(source, /country_id\s*,\s*geo_area_id/);
    assert.match(source, /OpportunityGeography|opportunityGeography|attachOpportunityGeography|resolveOpportunityGeography/);
  }
  assert.match(read('components/opportunities/OpportunityForm.tsx'), /CanonicalGeographySelector/);
});
