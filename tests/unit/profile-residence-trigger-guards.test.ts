import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../../supabase/migrations/20261204121000_profile_residence_trigger_guards.sql', import.meta.url), 'utf8');

test('trigger guards are additive and never disable triggers', () => {
  assert.doesNotMatch(sql, /disable trigger|session_replication_role|drop trigger/i);
  for (const fn of ['profile_location_coerce', 'sync_profile_names', 'set_profile_visibility_status']) assert.match(sql, new RegExp(`create or replace function public\\.${fn}\\(\\)`, 'i'));
});

test('location guard observes all legacy ID inputs and preserves coercion when changed', () => {
  for (const column of ['municipality_id', 'province_id', 'region_id']) assert.match(sql, new RegExp(`new\\.${column} is not distinct from old\\.${column}`, 'i'));
  assert.match(sql, /new\.province_id := m_row\.province_id/i);
  assert.match(sql, /new\.region_id := (?:m_row|p_row)\.region_id/i);
});

test('name guard skips unrelated updates but retains normalization and auth metadata sync', () => {
  for (const column of ['full_name', 'display_name', 'account_type', 'type', 'user_id']) assert.match(sql, new RegExp(`new\\.${column} is not distinct from old\\.${column}`, 'i'));
  assert.match(sql, /normalize_person_name/);
  assert.match(sql, /update auth\.users/i);
});

test('visibility guard is athlete staff specific and preserves completeness implementation', () => {
  assert.match(sql, /account_kind in \('athlete', 'staff'\)/i);
  for (const column of ['status', 'birth_year', 'country', 'sport', 'role', 'profile_visibility_status']) assert.match(sql, new RegExp(`new\\.${column} is not distinct from old\\.${column}`, 'i'));
  assert.match(sql, /when account_kind = 'club'[\s\S]*new\.region[\s\S]*new\.province[\s\S]*new\.city/i);
  assert.match(sql, /new\.profile_visibility_status := case when is_complete then 'published' else 'draft' end/i);
});
