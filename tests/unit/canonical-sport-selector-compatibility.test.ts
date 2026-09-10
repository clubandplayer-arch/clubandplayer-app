import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hydrateCanonicalSportValue,
  type LegacySportMapping,
} from '../../lib/taxonomy/canonicalSportSelector';

const mappings: LegacySportMapping[] = [
  { legacyValue: 'Calcio', sportId: 'football', disciplineId: 'association', variantId: 'eleven' },
  { legacyValue: 'Calcio a 8', sportId: 'football', disciplineId: 'association', variantId: 'eight' },
  { legacyValue: 'Futsal', sportId: 'football', disciplineId: 'futsal', variantId: null },
  { legacyValue: 'Volley', sportId: 'volleyball', disciplineId: null, variantId: null },
];

test('legacy sport selection hydrates the complete canonical chain', () => {
  assert.deepEqual(hydrateCanonicalSportValue(mappings, {
    legacySport: 'Calcio a 8', sportId: '', disciplineId: '', variantId: '',
  }), {
    legacySport: 'Calcio a 8', sportId: 'football', disciplineId: 'association', variantId: 'eight',
  });
  assert.deepEqual(hydrateCanonicalSportValue(mappings, {
    legacySport: 'Volley', sportId: '', disciplineId: '', variantId: '',
  }), {
    legacySport: 'Volley', sportId: 'volleyball', disciplineId: '', variantId: '',
  });
});

test('each visible sport option carries its complete hidden canonical chain', () => {
  for (const [legacySport, disciplineId, variantId] of [
    ['Calcio', 'association', 'eleven'],
    ['Calcio a 8', 'association', 'eight'],
    ['Futsal', 'futsal', ''],
  ]) {
    assert.deepEqual(hydrateCanonicalSportValue(mappings, {
      legacySport, sportId: '', disciplineId: '', variantId: '',
    }), {
      legacySport, sportId: 'football', disciplineId, variantId,
    });
  }
});
