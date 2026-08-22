import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CANONICAL_LANGUAGES, resolvePreferredLanguage } from '../../lib/preferences/languages';
import {
  resolveCountriesOfInterest,
  resolveOpenToRelocation,
  resolveResidenceCountry,
} from '../../lib/preferences/profilePreferences';

const migrationPath = new URL(
  '../../supabase/migrations/20260822130000_european_profile_preferences.sql',
  import.meta.url,
);
const migrationSql = readFileSync(migrationPath, 'utf8');

test('interface language is independent from residence and birth country', () => {
  const language = resolvePreferredLanguage({ preferredLanguageCode: 'fr', browserLocale: 'it-IT' });
  const residence = resolveResidenceCountry({
    preferences: { residenceCountryCode: 'IT' },
    legacyProfile: { country: 'Italia', birthCountry: 'SN' },
  });

  assert.equal(language.code, 'fr');
  assert.equal(residence.country?.iso2, 'IT');
});

test('birth country does not influence canonical or legacy residence resolution', () => {
  const canonicalResidence = resolveResidenceCountry({
    preferences: { residenceCountryCode: 'IT' },
    legacyProfile: { country: 'FR', birthCountry: 'SN' },
  });
  const legacyResidence = resolveResidenceCountry({
    preferences: null,
    legacyProfile: { country: 'Italia', birthCountry: 'SN' },
  });

  assert.equal(canonicalResidence.source, 'canonical');
  assert.equal(canonicalResidence.country?.iso2, 'IT');
  assert.equal(legacyResidence.source, 'legacy');
  assert.equal(legacyResidence.country?.iso2, 'IT');
});

test('supports multiple countries of interest including inactive future markets', () => {
  const interests = resolveCountriesOfInterest({
    canonicalCountryCodes: ['FR', 'ES', 'CH', 'DE', 'PT', 'AT', 'FR'],
    legacyInterestCountry: 'IT',
  });

  assert.equal(interests.source, 'canonical');
  assert.deepEqual(interests.countries.map((country) => country.iso2), ['FR', 'ES', 'CH', 'DE', 'PT', 'AT']);
  assert.ok(interests.countries.filter((country) => ['DE', 'PT', 'AT'].includes(country.iso2)).every((country) => !country.isActive));
});

test('falls back to the single legacy interest country without losing unknown values', () => {
  const known = resolveCountriesOfInterest({ canonicalCountryCodes: [], legacyInterestCountry: 'GQ' });
  assert.equal(known.source, 'legacy');
  assert.deepEqual(known.countries.map((country) => country.iso2), ['GQ']);

  const unknown = resolveCountriesOfInterest({ canonicalCountryCodes: null, legacyInterestCountry: 'Atlantide' });
  assert.equal(unknown.source, 'none');
  assert.equal(unknown.unrecognizedLegacyValue, 'Atlantide');
});

test('open to relocation has a safe false default and is separate from opportunities', () => {
  assert.equal(resolveOpenToRelocation(null), false);
  assert.equal(resolveOpenToRelocation({ openToRelocation: null }), false);
  assert.equal(resolveOpenToRelocation({ openToRelocation: true }), true);
});

test('language fallback uses supported browser locale then Italian without using country', () => {
  assert.equal(resolvePreferredLanguage({ browserLocale: 'es-MX' }).code, 'es');
  assert.equal(resolvePreferredLanguage({ browserLocale: 'de-DE' }).code, 'it');
  assert.equal(resolvePreferredLanguage({ preferredLanguageCode: 'en', browserLocale: 'fr-FR' }).code, 'en');
  assert.deepEqual(
    CANONICAL_LANGUAGES.filter((language) => language.isSupported && language.isActive).map((language) => language.code),
    ['it', 'en', 'fr', 'es'],
  );
});

test('migration creates only phase 2A tables with safe nullable preferences', () => {
  for (const table of ['languages', 'profile_preferences', 'profile_country_interests']) {
    assert.match(migrationSql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
    assert.match(migrationSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(migrationSql, /preferred_language_id uuid references public\.languages\(id\) on delete set null/i);
  assert.match(migrationSql, /residence_country_id uuid references public\.countries\(id\) on delete restrict/i);
  assert.match(migrationSql, /open_to_relocation boolean not null default false/i);
  assert.match(migrationSql, /primary key \(profile_id, country_id\)/i);
});

test('migration neither changes nor backfills protected legacy domains', () => {
  assert.doesNotMatch(migrationSql, /alter\s+table\s+(?:if\s+exists\s+)?public\.(profiles|opportunities|applications|posts|follows|regions|provinces|municipalities)\b/i);
  assert.doesNotMatch(migrationSql, /(?:insert\s+into|update|delete\s+from)\s+public\.(profiles|opportunities|applications)\b/i);
  assert.doesNotMatch(migrationSql, /location_children|profile_location_coerce|set_profile_visibility_status/i);
  assert.doesNotMatch(migrationSql, /(?:create|replace|drop)\s+(?:or\s+replace\s+)?view\s+public\.(players_view|athletes_view|clubs_view)\b/i);
  assert.doesNotMatch(migrationSql, /geo_areas|competitions|sports_organizations|content_language|nationalit/i);
});
