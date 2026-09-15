import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const form = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
const selector = readFileSync('components/geo/CanonicalGeographySelector.tsx', 'utf8');
const route = readFileSync('app/api/profiles/me/residence/route.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261219120000_club_canonical_geography.sql', 'utf8');

test('Club profile replaces the world/Italy-only controls with the Opportunity canonical cascade', () => {
  assert.match(form, /isClub \? \([\s\S]*idPrefix="club-geography"[\s\S]*<CanonicalGeographySelector/);
  assert.match(form, /setCountry\(selectedCountry\?\.iso2 \?\? ''\)/);
  assert.match(form, /setResidenceGeoAreaId\(null\)/);
  assert.match(form, /<ClubRegistrationsSection countryId=\{residenceCountryId\}/);
  assert.match(selector, /CanonicalCountryRead/);
});

test('Club canonical geography is owner-only and supports the six-country catalog', () => {
  assert.match(route, /profile\.account_type === 'club'/);
  assert.match(route, /rpc\('update_my_club_geography'/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /v_account_type <> 'club'/);
  assert.match(migration, /c\.is_supported = true/);
  assert.match(migration, /residence geo-area does not belong to residence country/);
  assert.match(migration, /grant execute on function public\.update_my_club_geography\(uuid, uuid\) to authenticated/);
});
