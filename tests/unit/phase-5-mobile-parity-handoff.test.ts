import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const roadmap = readFileSync('docs/mobile-parity-roadmap.md', 'utf8');
const handoff = readFileSync('docs/mobile-parity/phase-5-mobile-parity-handoff.md', 'utf8');

test('mobile parity roadmap requires audited handoffs and functional Android/iOS evidence', () => {
  assert.match(roadmap, /audit/i);
  assert.match(roadmap, /SHA\/release Web/);
  assert.match(roadmap, /test reale Android/);
  assert.match(roadmap, /test reale iOS/);
  assert.match(roadmap, /payload costruiti dalla UI/);
  assert.match(roadmap, /save\/read-after-write/);
  assert.match(roadmap, /MOBILE_PARITY_PHASE_<N>_PASS/);
  assert.match(roadmap, /FASE 9K/);
});

test('Phase 5 handoff pins the certified baseline and complete mobile contract', () => {
  assert.match(handoff, /PHASE_5J_FINAL_CERTIFICATION_PASS/);
  assert.match(handoff, /d69768bb2df05bb8fb7ead409cba83e806b4c76b/);
  assert.match(handoff, /GET \/api\/sports\/catalog/);
  assert.match(handoff, /un solo menu Sport/i);
  assert.match(handoff, /Calcio.*Calcio a 8.*Futsal/s);
  assert.match(handoff, /primarySport/);
  assert.match(handoff, /Non inviare mai contemporaneamente `sport` e `primarySport`/);
  assert.match(handoff, /Profile ed Experience/);
  assert.match(handoff, /Opportunities e Applications/);
  assert.match(handoff, /Search, Discover e WhoToFollow/);
  assert.match(handoff, /RLS|owner-scoped/);
  assert.match(handoff, /M5-01…M5-14 PASS su entrambe le piattaforme/);
  assert.match(handoff, /MOBILE_PARITY_PHASE_5_PASS/);
});

test('handoff does not claim that Mobile implementation is already complete', () => {
  assert.match(handoff, /Mobile implementation \| \*\*NOT STARTED\*\*/);
  assert.match(handoff, /Android certification \| \*\*NOT STARTED\*\*/);
  assert.match(handoff, /iOS certification \| \*\*NOT STARTED\*\*/);
  assert.doesNotMatch(handoff, /service-role key nel bundle Mobile.*(?:ammessa|consentita)/i);
});
