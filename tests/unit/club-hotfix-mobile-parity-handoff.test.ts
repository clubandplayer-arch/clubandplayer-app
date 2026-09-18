import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const handoff = readFileSync(
  'docs/mobile-parity/club-canonical-residence-hotfix-parity-handoff.md',
  'utf8',
);

test('Club hotfix Mobile handoff inventories every changed Web runtime contract', () => {
  for (const path of [
    'lib/profiles/completion.ts',
    'components/profiles/ProfileEditForm.tsx',
    'app/api/auth/whoami/route.ts',
    'middleware.ts',
    'app/api/clubs/registrations/route.ts',
    'components/profiles/ProfileMiniCard.tsx',
    'app/(dashboard)/clubs/[id]/page.tsx',
    'app/api/follows/suggestions/route.ts',
    'components/opportunities/OpportunityForm.tsx',
    'supabase/migrations/20261222120000_club_minimum_completion_requirements.sql',
  ]) {
    assert.ok(handoff.includes(`\`${path}\``), path);
  }
});

test('Club hotfix Mobile handoff defines gated micro-PRs and a complete acceptance matrix', () => {
  for (let step = 0; step <= 8; step += 1) assert.match(handoff, new RegExp(`MPR-${step}`));
  for (let scenario = 1; scenario <= 20; scenario += 1) {
    assert.match(handoff, new RegExp(`CPH-${String(scenario).padStart(2, '0')}`));
  }
  assert.match(handoff, /attendere autorizzazione esplicita/i);
  assert.match(handoff, /Android evidence/);
  assert.match(handoff, /iOS evidence/);
  assert.match(handoff, /BLOCKED_BACKEND_VERSION/);
});

test('Club hotfix Mobile handoff pins safety boundaries and localization behavior', () => {
  assert.match(handoff, /non creare\/applicare migration/i);
  assert.match(handoff, /non usare accesso diretto Supabase o[\s\S]*service_role/i);
  assert.match(handoff, /profile\.id/);
  assert.match(handoff, /Calcio/);
  assert.match(handoff, /Fútbol/);
  assert.match(handoff, /club_league_category/);
  assert.match(handoff, /registrazioni club/);
});
