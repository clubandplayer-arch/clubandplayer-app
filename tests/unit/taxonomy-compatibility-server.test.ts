import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const serverSource = readFileSync('lib/taxonomy/compatibilityCatalog.server.ts', 'utf8');

test('5E server catalog is read-only and never uses service credentials', () => {
  assert.doesNotMatch(serverSource, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|service[_-]?role/i);
  assert.match(serverSource, /legacy_sport_mappings/);
  assert.match(serverSource, /legacy_player_role_mappings/);
  assert.match(serverSource, /legacy_staff_role_mappings/);
});

test('5E server catalog validates parent ownership instead of trusting IDs independently', () => {
  assert.match(serverSource, /discipline\.sport_id !== sport\.id/);
  assert.match(serverSource, /variant\.discipline_id !== discipline\?\.id/);
  assert.match(serverSource, /playerRole\.sport_id !== sport\.id/);
  assert.match(serverSource, /player_roles!inner\(sport_id\)/);
});

test('5E is not wired into existing API, profile or Opportunity callers yet', () => {
  for (const path of [
    'app/api/profiles/me/route.ts',
    'app/api/profiles/me/experiences/route.ts',
    'app/api/opportunities/route.ts',
    'app/api/opportunities/[id]/route.ts',
  ]) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /compatibilityAdapter|SupabaseTaxonomyCatalog/,
      `${path} was wired during adapter-only 5E`);
  }
});
