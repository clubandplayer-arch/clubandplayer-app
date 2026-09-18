import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('admin users defaults to all registrations instead of hiding active accounts', () => {
  const page = readFileSync('app/admin/users/page.tsx', 'utf8');
  const route = readFileSync('app/api/admin/users/route.ts', 'utf8');

  assert.match(page, /useState<StatusFilter>\('all'\)/);
  assert.match(page, /<option value="all">Tutti<\/option>/);
  assert.match(route, /\? status : 'all'/);
  assert.match(route, /filterStatus === 'all' \? null : filterStatus/);
});
