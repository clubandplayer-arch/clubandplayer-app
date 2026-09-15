import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20261218120000_france_club_registration_catalog.sql', 'utf8');
const selector = readFileSync('app/api/sports/organization-memberships/route.ts', 'utf8');
const fields = readFileSync('components/sports/OrganizationCategoryFields.tsx', 'utf8');
const display = readFileSync('lib/sports/organizationDisplay.ts', 'utf8');
const categoryFields = readFileSync('components/sports/OrganizationCategoryFields.tsx', 'utf8');

const expectedCounts: Record<string, number> = {
  calcio:11, calcio_a_8:1, futsal:5, volleyball:12, basketball:15, handball:13,
  rugby:14, ice_hockey:6, water_polo:6, field_hockey:4, baseball:4, softball:2,
  american_football:4, lacrosse:1,
};

test('France catalog contains the authorized 11 organizations in display order', () => {
  const codes = ['fff','ffvolley','ffbb','ffhandball','ffr','ffhg','ffn','ffh','ffbs','fffa','france_lacrosse'];
  codes.forEach((code, index) => {
    assert.match(migration, new RegExp(`\\('${code}','[^']+','[^']+',${index + 1}\\)`));
    assert.match(display, new RegExp(`${code}:`));
  });
  assert.match(migration, /France organization count mismatch/);
});

test('France catalog has all 98 exact country, sport and organization category tuples', () => {
  let total = 0;
  for (const [sport, count] of Object.entries(expectedCounts)) {
    const matches = migration.match(new RegExp(`\\('[^']+','${sport}','[^']+','[^']*(?:''[^']*)*',[0-9]+\\)`, 'g')) ?? [];
    assert.equal(matches.length, count, sport);
    total += matches.length;
  }
  assert.equal(total, 98);
  assert.match(migration, /France category count mismatch/);
});

test('youth consolidation and Ligue 3 historical alias are explicit', () => {
  assert.equal((migration.match(/,'giovanili','Giovanili',[0-9]+\)/g) ?? []).length, 2);
  assert.doesNotMatch(migration, /National U19|National U17|U20 \(|U18 \(|'U15'/);
  assert.match(migration, /historicalAlias'.*'National'/);
});

test('the shared category UI localizes Giovanili instead of exposing the stored Italian label', () => {
  assert.match(categoryFields, /localizeOpportunityCategory\(c\.canonical_name, t\)/);
  const expected = { it: 'Giovanili', fr: 'Jeunes', en: 'Youth', es: 'Categorías juveniles' };
  for (const [locale, label] of Object.entries(expected)) {
    const messages = readFileSync(`lib/i18n/messages/vocabulary/${locale}.ts`, 'utf8');
    assert.match(messages, new RegExp(`vocabulary\\.category\\.youth['"]?: ?['"]${label}`));
  }
});

test('catalog endpoint filters explicit country while preserving the parameterless legacy fallback', () => {
  assert.match(selector, /searchParams\.get\('countryId'\)/);
  assert.match(selector, /if \(countryId\) query = query\.eq\('country_id', countryId\)/);
  assert.match(fields, /countryId=\$\{encodeURIComponent\(countryId\)\}/);
  assert.match(fields, /\[countryId\]/);
});

test('registration trigger rejects a category outside the Club canonical country', () => {
  assert.match(migration, /profile_preferences pp/);
  assert.match(migration, /legacy_country_mappings lcm/);
  assert.match(migration, /c\.country_id=coalesce\(pp\.residence_country_id,lcm\.country_id\)/);
  assert.doesNotMatch(migration, /pp\.residence_country_id is null or/);
});

test('canonical country writes reject incompatible active Club records', () => {
  const geographyMigration = readFileSync('supabase/migrations/20261219120000_club_canonical_geography.sql', 'utf8');
  assert.match(geographyMigration, /from public\.club_sport_registrations r[\s\S]*r\.is_active = true[\s\S]*c\.country_id is distinct from p_residence_country_id/);
  assert.match(geographyMigration, /from public\.club_honors h[\s\S]*h\.is_active = true[\s\S]*c\.country_id is distinct from p_residence_country_id/);
});
