import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const row = readFileSync('components/search/SearchResultRow.tsx', 'utf8');
const route = readFileSync('app/api/search/route.ts', 'utf8');

test('search results localize controlled sport and role values in the selected UI language', () => {
  assert.match(row, /localizeSport\(result\.sport, t\)/);
  assert.match(row, /localizeSportRole\(result\.role, t\)/);
  assert.match(row, /t\(KIND_KEYS\[result\.kind\]\)/);
  assert.match(route, /sport: row\.sport \|\| null/);
  assert.match(route, /role: row\.role \|\| null/);
  assert.doesNotMatch(row, /KIND_LABELS/);
});
