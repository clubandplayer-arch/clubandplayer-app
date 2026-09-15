import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const form = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
const selector = readFileSync('components/geo/CanonicalGeographySelector.tsx', 'utf8');
const route = readFileSync('app/api/profiles/me/residence/route.ts', 'utf8');
const writer = readFileSync('lib/geo/clubGeographyWrite.server.ts', 'utf8');

test('Club profile replaces the world/Italy-only controls with the Opportunity canonical cascade', () => {
  assert.match(form, /isClub \? \([\s\S]*idPrefix="club-geography"[\s\S]*<CanonicalGeographySelector/);
  assert.match(form, /setCountry\(selectedCountry\?\.iso2 \?\? ''\)/);
  assert.match(form, /setResidenceGeoAreaId\(null\)/);
  assert.match(form, /<ClubRegistrationsSection countryId=\{residenceCountryId\}/);
  assert.match(form, /club\.geography\.requiredHelp/);
  assert.match(selector, /CanonicalCountryRead/);
});

test('Club canonical geography uses existing owner RLS and the supported country catalog', () => {
  assert.match(route, /profile\.account_type === 'club'/);
  assert.match(route, /writeMyClubGeography\(supabase, profile\.id, patch\)/);
  assert.match(writer, /from\('countries'\)/);
  assert.match(writer, /rpc\('update_my_club_geography'/);
  assert.match(writer, /PGRST202/);
  assert.match(writer, /buildResidenceDualWritePlan/);
  assert.match(writer, /from\('profile_preferences'\)\.upsert/);
  assert.doesNotMatch(writer, /service_role/);
});

test('Club canonical geography is validated before the legacy base profile is saved', () => {
  const submit = form.slice(form.indexOf('async function onSubmit'), form.indexOf('const handlePastExperienceClubChange'));
  const canonicalWrite = submit.indexOf("fetch('/api/profiles/me/residence'");
  const baseWrite = submit.indexOf("fetch('/api/profiles/me',");
  assert.ok(canonicalWrite >= 0 && canonicalWrite < baseWrite);
});

test('Club base profile save preserves the canonical geography dual-write', () => {
  const submit = form.slice(form.indexOf('async function onSubmit'), form.indexOf('const handlePastExperienceClubChange'));
  const canonicalWrite = submit.indexOf("fetch('/api/profiles/me/residence'");
  const baseWrite = submit.indexOf("fetch('/api/profiles/me',");
  const betweenWrites = submit.slice(canonicalWrite, baseWrite);

  for (const field of [
    'region',
    'province',
    'city',
    'residence_region_id',
    'residence_province_id',
    'residence_municipality_id',
    'interest_region',
    'interest_province',
    'interest_city',
    'interest_region_id',
    'interest_province_id',
    'interest_municipality_id',
  ]) {
    assert.match(betweenWrites, new RegExp(`delete basePayload\\.${field}`));
  }
});

test('Club country changes refresh archived registrations and honors in the editor', () => {
  const registrations = readFileSync('components/clubs/ClubRegistrationsSection.tsx', 'utf8');
  const honors = readFileSync('components/clubs/ClubHonorsSection.tsx', 'utf8');
  assert.match(form, /dispatchEvent\(new Event\('club-geography-updated'\)\)/);
  assert.match(registrations, /addEventListener\('club-geography-updated', load\)/);
  assert.match(honors, /addEventListener\('club-geography-updated', load\)/);
});

test('Club geography errors preserve the Supabase error message', () => {
  assert.match(route, /typeof reason\.message === 'string'/);
  assert.match(writer, /category:sports_organization_category_id\(country_id\)/);
  assert.match(writer, /update\(\{ is_active: false, is_primary: false \}\)/);
});
