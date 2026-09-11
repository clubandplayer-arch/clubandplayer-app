import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkpoint = readFileSync(
  'docs/european-expansion/phase-6c-bis-fifteen-sport-coverage.md',
  'utf8',
);

test('Phase 6 Preview gate rejects shared Production database configuration', () => {
  assert.match(checkpoint, /All Environments/);
  assert.match(checkpoint, /blocca migration, canary e smoke con scritture/);
  assert.match(checkpoint, /Preview Branch Supabase healthy/);
  assert.match(checkpoint, /differiscano dal project ref Production/);
});

test('Preview setup keeps public and privileged Supabase variables coherent', () => {
  for (const name of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) assert.match(checkpoint, new RegExp(name));
  assert.match(checkpoint, /non basta cambiare la sola variabile pubblica/);
  assert.match(checkpoint, /rigenerare un deployment Preview/);
  assert.match(checkpoint, /Non applicare la migration/);
});
