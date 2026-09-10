import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20261210120000_opportunity_canonical_sports_context.sql', 'utf8');

test('5G migration is additive and keeps canonical context on opportunities', () => {
  for (const column of ['sport_id', 'sport_discipline_id', 'sport_variant_id', 'player_position_id', 'staff_role_id', 'gender_code']) {
    assert.match(sql, new RegExp(`add column if not exists ${column}`));
  }
  assert.match(sql, /references public\.sports\(id\)/);
  assert.match(sql, /references public\.player_positions\(id\)/);
  assert.match(sql, /references public\.staff_roles\(id\)/);
  assert.doesNotMatch(sql, /alter table public\.applications/i);
  assert.doesNotMatch(sql, /\b(update|delete from|truncate)\b/i);
});
