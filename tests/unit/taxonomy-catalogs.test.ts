import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CANONICAL_COUNTRIES,
  CANONICAL_SPORTS,
} from '../../lib/taxonomy/catalog';
import {
  getLegacySportLabel,
  normalizeLegacyTaxonomyValue,
  resolveCountryTaxonomy,
  resolveSportTaxonomy,
} from '../../lib/taxonomy/legacyMappings';

const migrationPath = new URL(
  '../../supabase/migrations/20260822120000_european_catalog_foundation.sql',
  import.meta.url,
);
const migrationSql = readFileSync(migrationPath, 'utf8');

test('contains every launch country exactly once and keeps future countries inactive', () => {
  const iso2 = CANONICAL_COUNTRIES.map((country) => country.iso2);
  assert.equal(new Set(iso2).size, iso2.length);
  assert.deepEqual(
    CANONICAL_COUNTRIES.filter((country) => country.isSupported && country.isActive).map((country) => country.iso2),
    ['IT', 'FR', 'ES', 'CH', 'SI', 'PL'],
  );
  for (const code of ['PT', 'DE', 'AT']) {
    const country = CANONICAL_COUNTRIES.find((item) => item.iso2 === code);
    assert.ok(country);
    assert.equal(country.isSupported, false);
    assert.equal(country.isActive, false);
  }
  assert.match(migrationSql, /create unique index if not exists countries_iso2_key/i);
});

test('catalogues every country code currently present in production without activating extra markets', () => {
  const productionCountryCodes = ['IT', 'BR', 'AL', 'AR', 'BJ', 'DO', 'ES', 'GH', 'GQ', 'PY', 'RU', 'SN', 'UA', 'DE'];
  for (const code of productionCountryCodes) {
    const country = CANONICAL_COUNTRIES.find((item) => item.iso2 === code);
    assert.ok(country, code);
    assert.equal(resolveCountryTaxonomy(code).country?.iso2, code);
  }

  const inactiveProductionCountries = ['BR', 'AL', 'AR', 'BJ', 'DO', 'GH', 'GQ', 'PY', 'RU', 'SN', 'UA'];
  for (const code of inactiveProductionCountries) {
    const country = CANONICAL_COUNTRIES.find((item) => item.iso2 === code);
    assert.equal(country?.isSupported, false, code);
    assert.equal(country?.isActive, false, code);
    assert.match(migrationSql, new RegExp(`\\('${code}', '[A-Z]{3}', '[^']+', false, false, \\d+\\)`));
  }
});

test('country resolver follows canonical, legacy, unknown and empty precedence', () => {
  assert.equal(resolveCountryTaxonomy('IT').status, 'canonical');
  assert.equal(resolveCountryTaxonomy('Italia').country?.iso2, 'IT');
  assert.equal(resolveCountryTaxonomy('italy').country?.iso2, 'IT');
  assert.deepEqual(resolveCountryTaxonomy('Atlantide'), {
    status: 'unknown',
    legacyValue: 'Atlantide',
    country: null,
  });
  assert.equal(resolveCountryTaxonomy(null).status, 'empty');
});

test('all 15 currently supported legacy labels resolve', () => {
  const labels = [
    'Calcio',
    'Calcio a 8',
    'Calcio a 7',
    'Futsal',
    'Volley',
    'Basket',
    'Pallanuoto',
    'Pallamano',
    'Rugby',
    'Hockey su prato',
    'Hockey su ghiaccio',
    'Baseball',
    'Softball',
    'Lacrosse',
    'Football americano',
  ];
  for (const label of labels) assert.ok(resolveSportTaxonomy(label).sport, label);
});

test('football ecosystem resolves disciplines and variants', () => {
  const football = resolveSportTaxonomy('Calcio');
  assert.equal(football.sport?.code, 'football');
  assert.equal(football.discipline?.code, 'association_football');
  assert.equal(football.variant?.code, 'eleven_a_side');

  const football8 = resolveSportTaxonomy('Calcio a 8');
  assert.equal(football8.sport?.code, 'football');
  assert.equal(football8.discipline?.code, 'association_football');
  assert.equal(football8.variant?.code, 'eight_a_side');

  const football7 = resolveSportTaxonomy('Calcio a 7');
  assert.equal(football7.sport?.code, 'football');
  assert.equal(football7.discipline?.code, 'association_football');
  assert.equal(football7.variant?.code, 'seven_a_side');

  const futsal = resolveSportTaxonomy('Futsal');
  assert.equal(futsal.sport?.code, 'football');
  assert.equal(futsal.discipline?.code, 'futsal');
  assert.equal(futsal.variant, null);
});

test('required legacy aliases resolve to the same canonical sports', () => {
  assert.equal(resolveSportTaxonomy('Volley').sport?.code, 'volleyball');
  assert.equal(resolveSportTaxonomy('Pallavolo').sport?.code, 'volleyball');
  assert.equal(resolveSportTaxonomy('hockey_prato').sport?.code, 'field_hockey');
  assert.equal(resolveSportTaxonomy('Hockey su prato').sport?.code, 'field_hockey');
  assert.equal(resolveSportTaxonomy('hockey_ghiaccio').sport?.code, 'ice_hockey');
  assert.equal(resolveSportTaxonomy('Hockey su ghiaccio').sport?.code, 'ice_hockey');
  assert.equal(resolveSportTaxonomy('football_americano').sport?.code, 'american_football');
  assert.equal(resolveSportTaxonomy('Football americano').sport?.code, 'american_football');
});

test('mapping is case-insensitive and preserves unknown legacy values', () => {
  assert.equal(resolveSportTaxonomy('  pALLAvÓlo ').sport?.code, 'volleyball');
  const unknown = resolveSportTaxonomy('Sport inventato');
  assert.equal(unknown.status, 'unknown');
  assert.equal(unknown.legacyValue, 'Sport inventato');
  assert.equal(unknown.legacyLabel, 'Sport inventato');
  assert.equal(unknown.sport, null);
  assert.equal(getLegacySportLabel('Pallavolo'), 'Volley');
});

test('application normalization exactly matches sport mapping keys seeded in SQL', () => {
  const cases = [
    ['Calcio a 8', 'calcio_a_8'],
    ['Hockey su prato', 'hockey_su_prato'],
    ['Hockey su ghiaccio', 'hockey_su_ghiaccio'],
    ['Football americano', 'football_americano'],
    ['Pallavólo', 'pallavolo'],
    ['  cALCIO A 8  ', 'calcio_a_8'],
    ['  HOCKEY SU PRATO ', 'hockey_su_prato'],
  ] as const;

  for (const [source, expectedKey] of cases) {
    assert.equal(normalizeLegacyTaxonomyValue(source), expectedKey, source);
    assert.match(
      migrationSql,
      new RegExp(`\\('[^']+', '${expectedKey}', '[^']+'`),
      `SQL seed is missing normalized key ${expectedKey}`,
    );
  }
});

test('cricket is resolvable but is not active or part of the 15 UI sports', () => {
  const cricket = resolveSportTaxonomy('cricket');
  assert.equal(cricket.sport?.code, 'cricket');
  assert.equal(cricket.sport?.isActive, false);
  assert.equal(CANONICAL_SPORTS.filter((sport) => sport.isActive).length, 12);
});

test('migration is additive and does not alter protected legacy domains', () => {
  assert.doesNotMatch(migrationSql, /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(profiles|opportunities|applications|posts|follows)\b/i);
  assert.doesNotMatch(migrationSql, /(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?(profiles|opportunities|applications)\b/i);
  assert.doesNotMatch(migrationSql, /(?:create|replace|drop)\s+(?:or\s+replace\s+)?view\s+(?:public\.)?(players_view|athletes_view|clubs_view)\b/i);
  assert.doesNotMatch(migrationSql, /location_children|profile_location_coerce|set_profile_visibility_status/i);
});

test('migration creates only phase-one catalogues and their RLS policies', () => {
  for (const table of [
    'countries',
    'sports',
    'sport_disciplines',
    'sport_variants',
    'legacy_country_mappings',
    'legacy_sport_mappings',
  ]) {
    assert.match(migrationSql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
    assert.match(migrationSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.doesNotMatch(migrationSql, /geo_areas|competitions|sports_organizations|profile_sports/i);
});
