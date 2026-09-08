import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../../supabase/migrations/20261209120000_athlete_experience_sport_context.sql', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../integration/sql/athlete-experience-sport-runtime-tests.sql', import.meta.url), 'utf8');

test('experience migration is additive, coherent and has a unique version', () => {
  for (const column of ['sport_id', 'sport_discipline_id', 'sport_variant_id']) assert.ok(sql.includes(`add column if not exists ${column} uuid`));
  assert.match(sql, /foreign key \(sport_discipline_id, sport_id\).*sport_disciplines\(id, sport_id\)/s);
  assert.match(sql, /foreign key \(sport_variant_id, sport_discipline_id\).*sport_variants\(id, discipline_id\)/s);
  assert.match(sql, /athlete_experiences_sport_shape_check/);
});

test('runtime test separates RLS denial from privileged physical preservation', () => {
  assert.match(runtime, /delete from public\.athlete_experiences[\s\S]*affected=0/);
  assert.match(runtime, /reset role;[\s\S]*other owner experience physically preserved/);
  assert.match(runtime, /owner-two reset preserves owner-one row/);
});

test('replacement RPC is owner-derived, security invoker and atomic', () => {
  assert.match(sql, /security invoker/);
  assert.match(sql, /v_uid uuid := auth\.uid\(\)/);
  assert.doesNotMatch(sql, /p_profile_id/);
  assert.match(sql, /delete from public\.athlete_experiences[\s\S]*insert into public\.athlete_experiences/);
  assert.match(sql, /revoke all.*from public/s);
  assert.match(sql, /^begin;[\s\S]*commit;\s*$/);
});
