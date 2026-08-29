import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { writeMyProfileResidence } from '../../lib/geo/profileResidenceWrite.server';
import type { ResidencePatch } from '../../lib/geo/profileResidenceWriteContract';

const sql = readFileSync(new URL('../../supabase/migrations/20261204120000_transactional_profile_residence_rpc.sql', import.meta.url), 'utf8');
const automaticActivationMigration = new URL('../../supabase/migrations/20261204122000_enable_profile_residence_rpc.sql', import.meta.url);
const manualActivationRunbook = new URL('../../supabase/runbooks/manual/20261204122000_enable_profile_residence_rpc.sql', import.meta.url);
const activationSql = readFileSync(manualActivationRunbook, 'utf8');
const profileRoute = readFileSync(new URL('../../app/api/profiles/me/route.ts', import.meta.url), 'utf8');
const countryId = '10000000-0000-4000-8000-000000000001';
const areaId = '20000000-0000-4000-8000-000000000001';

test('RPC has a narrow UUID signature, no client profile ID and SECURITY INVOKER RLS semantics', () => {
  assert.match(sql, /function public\.update_my_profile_residence\(\s*p_residence_country_id uuid,\s*p_residence_geo_area_id uuid\s*\)/i);
  assert.doesNotMatch(sql, /p_profile_id|jsonb\s*\)/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(sql, /where p\.user_id = v_uid/i);
  assert.match(sql, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from public/i);
  assert.match(sql, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from anon/i);
  assert.match(sql, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from authenticated/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /service[_ -]?role/i);
});

test('RPC activation is isolated in a manual grant-only runbook outside automatic migrations', () => {
  assert.equal(existsSync(automaticActivationMigration), false);
  assert.match(activationSql, /MANUAL ACTIVATION ONLY — DO NOT APPLY WITHOUT EXPLICIT ROLLOUT APPROVAL/);
  assert.match(activationSql, /(?:^|\n)begin;/i);
  assert.match(activationSql, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from public/i);
  assert.match(activationSql, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from anon/i);
  assert.match(activationSql, /grant execute on function public\.update_my_profile_residence\(uuid, uuid\) to authenticated/i);
  assert.match(activationSql, /commit;\s*$/i);
  assert.doesNotMatch(activationSql, /create(?:\s+or\s+replace)?\s+function|insert\s+into|update\s+public\.|delete\s+from|alter\s+table/i);
});

test('anonymous, missing, foreign and ineligible profiles are rejected before writes', () => {
  assert.match(sql, /if v_uid is null[\s\S]*authentication required/i);
  assert.match(sql, /if v_profile_count = 0[\s\S]*profile not found/i);
  assert.match(sql, /if v_profile_count > 1[\s\S]*multiple profiles found for authenticated user/i);
  assert.doesNotMatch(sql, /where p\.user_id = v_uid\s+limit 1/i);
  assert.match(sql, /v_account_type not in \('athlete', 'staff'\)/i);
  assert.match(sql, /profile role is not eligible/i);
  for (const role of ['club', 'institution', 'fan']) assert.doesNotMatch(sql, new RegExp(`'${role}'\\s*\\)`));
  assert.doesNotMatch(sql, /is_admin|target.*profile/i);
});

test('country, area and complete ancestor chain are validated', () => {
  assert.match(sql, /c\.is_supported = true[\s\S]*c\.is_active = true/i);
  assert.match(sql, /ga\.id = p_residence_geo_area_id[\s\S]*ga\.is_active = true/i);
  assert.match(sql, /v_current\.country_id <> p_residence_country_id/i);
  assert.match(sql, /v_current\.id = any\(v_seen\)/i);
  assert.match(sql, /v_depth > 16/i);
  assert.match(sql, /where ga\.id = v_current\.parent_id[\s\S]*residence ancestor was not found/i);
  assert.match(sql, /a residence geo-area requires a residence country/i);
});

test('Italy requires one mapping per canonical level and rejects missing or ambiguous mappings', () => {
  for (const pair of [['REGION', 'region'], ['PROVINCE', 'province'], ['MUNICIPALITY', 'municipality']]) {
    assert.match(sql, new RegExp(`area_type = '${pair[0]}'[\\s\\S]*source_entity_type = '${pair[1]}'`, 'i'));
  }
  assert.ok((sql.match(/v_mapping_count = 0/g) ?? []).length === 3);
  assert.ok((sql.match(/v_mapping_count > 1/g) ?? []).length === 3);
  assert.match(sql, /source_system = 'italy_legacy'/i);
  assert.ok((sql.match(/m\.legacy_id::numeric <= 2147483647/g) ?? []).length === 6);
  assert.ok((sql.match(/if not v_mapping_ids_valid/g) ?? []).length === 3);
  assert.doesNotMatch(sql, /and m\.legacy_id ~/i);
});

test('foreign projections cover FR ES CH with optional District SI and PL while Italy IDs stay null', () => {
  for (const type of ['REGION', 'DEPARTMENT', 'COMMUNE', 'AUTONOMOUS_COMMUNITY', 'PROVINCE', 'MUNICIPALITY', 'CANTON', 'DISTRICT', 'STATISTICAL_REGION', 'VOIVODESHIP', 'POWIAT', 'GMINA']) {
    assert.match(sql, new RegExp(`'${type}'`));
  }
  assert.match(sql, /v_region_id integer := null/i);
  assert.match(sql, /v_province_id integer := null/i);
  assert.match(sql, /v_municipality_id integer := null/i);
});

test('RPC atomically updates only residence allowlist and upserts initially absent preferences', () => {
  assert.match(sql, /^begin;/i); assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /update public\.profiles[\s\S]*set region = v_region,[\s\S]*residence_municipality_id = v_municipality_id/i);
  assert.match(sql, /insert into public\.profile_preferences[\s\S]*on conflict \(profile_id\) do update/i);
  assert.match(sql, /residence_country_id = excluded\.residence_country_id/i);
  assert.match(sql, /residence_geo_area_id = excluded\.residence_geo_area_id/i);
  assert.match(sql, /if not found then[\s\S]*profile update was not authorized/i);
  assert.doesNotMatch(sql, /exception\s+when|commit;[\s\S]*update public\.profiles/i);
  for (const forbidden of ['interest_', 'birth_country', 'birth_region', 'birth_province', 'birth_municipality', 'open_to_relocation', 'country =']) {
    assert.doesNotMatch(sql, new RegExp(forbidden, 'i'));
  }
});

test('reset and country-only clear legacy residence while full writes return canonical-first state', () => {
  assert.match(sql, /p_residence_country_id is null and p_residence_geo_area_id is not null/i);
  assert.match(sql, /v_region text := null/i);
  assert.match(sql, /'source', case when p_residence_country_id is null then 'none' else 'canonical' end/i);
  assert.match(sql, /'residenceCountryId', p_residence_country_id/i);
  assert.match(sql, /'residenceGeoAreaId', p_residence_geo_area_id/i);
});

test('server wrapper skips absent, never sends profile ID and returns simulated canonical read-after-write', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; return { data: null, error: null }; } };
  assert.deepEqual(await writeMyProfileResidence(client as never, { kind: 'absent' }), { status: 'skipped', data: null });
  assert.equal(called, false);

  let rpcName = ''; let rpcArgs: Record<string, unknown> = {};
  const resultData = { profileId: 'owner', source: 'canonical', residenceCountryId: countryId, residenceGeoAreaId: areaId, legacyResidence: { region: 'Sicilia', province: 'Catania', city: 'Catania', regionId: 19, provinceId: 87, municipalityId: 87015 } };
  const successClient = { rpc: async (name: string, args: Record<string, unknown>) => { rpcName = name; rpcArgs = args; return { data: resultData, error: null }; } };
  const patch: ResidencePatch = { kind: 'full', residenceCountryId: countryId, residenceGeoAreaId: areaId };
  assert.deepEqual(await writeMyProfileResidence(successClient as never, patch), { status: 'written', data: resultData });
  assert.equal(rpcName, 'update_my_profile_residence');
  assert.deepEqual(rpcArgs, { p_residence_country_id: countryId, p_residence_geo_area_id: areaId });
  assert.equal('profile_id' in rpcArgs, false);
});

test('server wrapper propagates RPC errors for transactional rollback paths', async () => {
  const profilesFailure = { message: 'profiles update failed' };
  const preferencesFailure = { message: 'profile_preferences upsert failed' };
  for (const failure of [profilesFailure, preferencesFailure]) {
    const client = { rpc: async () => ({ data: null, error: failure }) };
    await assert.rejects(() => writeMyProfileResidence(client as never, { kind: 'reset', residenceCountryId: null, residenceGeoAreaId: null }), failure);
  }
});

test('partial PATCH interest_country regression is fixed server-side and client-side', () => {
  assert.match(profileRoute, /interest_country:\s*'text'/);
  assert.doesNotMatch(profileRoute, /updates\.interest_country\s*===\s*undefined[^\n]*['"]IT['"]/);
  assert.match(profileRoute, /if \(updates\.interest_country\) updates\.interest_country = updates\.interest_country\.toString\(\)\.trim\(\)\.toUpperCase\(\)/);
  const form = readFileSync(new URL('../../components/profiles/ProfileEditForm.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(form, /interestCountry \|\| 'IT'/);
  assert.doesNotMatch(form, /useState\('IT'\)/);
});
