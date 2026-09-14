import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../supabase/migrations/20261212120000_sports_organization_categories.sql', import.meta.url), 'utf8');

test('creates the additive stable category table with exact structural scope constraints', () => {
  assert.match(migration, /create table public\.sports_organization_categories/);
  assert.match(migration, /organization_id uuid not null references public\.sports_organizations\(id\)/);
  assert.match(migration, /country_id uuid not null references public\.countries\(id\)/);
  assert.match(migration, /foreign key \(discipline_id, sport_id\)[\s\S]*sport_disciplines/);
  assert.match(migration, /foreign key \(variant_id, discipline_id\)[\s\S]*sport_variants/);
  assert.match(migration, /unique nulls not distinct \(organization_id, country_id, sport_id, discipline_id, variant_id, code\)/);
  for (const forbidden of ['valid_from', 'valid_to', 'season_id', 'competition_id', 'territorial_scope', 'level_rank']) {
    assert.equal(migration.includes(forbidden), false, forbidden);
  }
});

test('materializes only Lega Calcio a 8 and three stable C8 categories', () => {
  assert.match(migration, /'lega_calcio_a_8',[\s\S]*'Lega Calcio a 8',[\s\S]*'league'/);
  for (const [code, name] of [['c8_serie_a', 'Serie A'], ['c8_serie_a2', 'Serie A2'], ['c8_serie_b', 'Serie B']]) {
    assert.match(migration, new RegExp(`'${code}', '${name}'`));
  }
  assert.match(migration, /c\.iso2 = 'IT'/);
  assert.match(migration, /s\.code = 'football'/);
  assert.match(migration, /d\.code = 'association_football'/);
  assert.match(migration, /v\.code = 'eight_a_side'/);
  for (const excluded of ["'lnd'", "'eifa'", "'fip'", "'seven_a_side'", "'futsal'"]) {
    assert.equal(migration.includes(excluded), false, excluded);
  }
  assert.match(migration, /'league'/);
  assert.doesNotMatch(migration, /insert into public\.sports_organization_countries/);
  assert.doesNotMatch(migration, /join public\.sports_organization_countries/);
  assert.doesNotMatch(migration, /uuid_generate|uuidv5|uuid_v5|namespace/i);
  assert.match(migration, /IDs are one-time generated values frozen as literals/);
});

test('keeps internal provenance separate from official evidence without a license claim', () => {
  assert.match(migration, /'clubandplayer_internal_review'/);
  assert.match(migration, /'officialSourceUrl', 'https:\/\/www\.legacalcioa8\.it\//);
  assert.match(migration, /'evidenceUse', 'organization_name_only'/);
  assert.match(migration, /'organizationTypeDecision', 'product_owner_confirmed'/);
  assert.match(migration, /'officialSourceUrl', seed\.source_url/);
  assert.doesNotMatch(migration, /license/i);
  assert.doesNotMatch(migration, /canonicalKey|identityPolicy/);
});

test('fails closed on prerequisite cardinality and asserts the exact postcondition', () => {
  assert.match(migration, /prerequisite_count <> 1/);
  assert.match(migration, /c\.is_active = true and c\.is_supported = true/);
  assert.match(migration, /s\.is_active = true/);
  assert.match(migration, /d\.is_active = true/);
  assert.match(migration, /v\.is_active = true/);
  assert.match(migration, /organization_count <> 1/);
  assert.match(migration, /category_count <> 3/);
  assert.match(migration, /raise exception 'Phase 6D postcondition mismatch/);
});

test('category catalogue has public read, admin-only writes and explicit grants', () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /for select to anon, authenticated using \(true\)/);
  assert.match(migration, /for insert to authenticated[\s\S]*p\.is_admin = true/);
  assert.match(migration, /for update to authenticated[\s\S]*p\.is_admin = true/);
  assert.match(migration, /for delete to authenticated[\s\S]*p\.is_admin = true/);
  assert.match(migration, /grant select on table public\.sports_organization_categories to anon, authenticated/);
});
