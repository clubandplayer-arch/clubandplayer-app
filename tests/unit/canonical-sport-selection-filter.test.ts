import assert from 'node:assert/strict';
import test from 'node:test';

import { applyExactCanonicalSportFilters } from '../../lib/search/canonicalSportFilters';

const FOOTBALL_ID = '11111111-1111-4111-8111-111111111111';
const FUTSAL_ID = '22222222-2222-4222-8222-222222222222';
const EIGHT_A_SIDE_ID = '33333333-3333-4333-8333-333333333333';

test('exact sport selection keeps base Football separate from its disciplines and variants', () => {
  let expression = '';
  const query = { or(value: string) { expression = value; return this; } };

  applyExactCanonicalSportFilters(query, {
    sportId: FOOTBALL_ID,
    disciplineId: null,
    variantId: null,
  }, 'Calcio');

  assert.equal(
    expression,
    `and(sport_id.eq.${FOOTBALL_ID},sport_discipline_id.is.null,sport_variant_id.is.null,sport.ilike."Calcio"),and(sport_id.is.null,sport.ilike."Calcio")`,
  );
});

test('exact sport selection includes the complete discipline and variant tuple', () => {
  let expression = '';
  const query = { or(value: string) { expression = value; return this; } };

  applyExactCanonicalSportFilters(query, {
    sportId: FOOTBALL_ID,
    disciplineId: FUTSAL_ID,
    variantId: EIGHT_A_SIDE_ID,
  }, 'Calcio a 8');

  assert.equal(
    expression,
    `and(sport_id.eq.${FOOTBALL_ID},sport_discipline_id.eq.${FUTSAL_ID},sport_variant_id.eq.${EIGHT_A_SIDE_ID},sport.ilike."Calcio a 8"),and(sport_id.is.null,sport.ilike."Calcio a 8")`,
  );
});

test('exact canonical-only selection emits explicit null constraints', () => {
  const calls: Array<[string, string, unknown]> = [];
  const query = {
    eq(column: string, value: unknown) { calls.push(['eq', column, value]); return this; },
    is(column: string, value: unknown) { calls.push(['is', column, value]); return this; },
  };

  applyExactCanonicalSportFilters(query, {
    sportId: FOOTBALL_ID,
    disciplineId: FUTSAL_ID,
    variantId: null,
  });

  assert.deepEqual(calls, [
    ['eq', 'sport_id', FOOTBALL_ID],
    ['eq', 'sport_discipline_id', FUTSAL_ID],
    ['is', 'sport_variant_id', null],
  ]);
});
