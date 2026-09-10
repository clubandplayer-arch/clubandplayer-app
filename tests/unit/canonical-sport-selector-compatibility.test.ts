import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hydrateCanonicalSportValue,
  resolveLegacySportValue,
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

test('variant and discipline changes restore the legacy keys used by roles and categories', () => {
  assert.equal(resolveLegacySportValue(mappings, 'football', 'association', 'eleven', 'Calcio'), 'Calcio');
  assert.equal(resolveLegacySportValue(mappings, 'football', 'association', 'eight', 'Calcio'), 'Calcio a 8');
  assert.equal(resolveLegacySportValue(mappings, 'football', 'futsal', '', 'Calcio'), 'Futsal');
  assert.equal(resolveLegacySportValue(mappings, 'volleyball', '', '', 'football'), 'Volley');
});
