import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('Phase 5C smoke fixes localize preferred side without changing persisted values', () => {
  const form = read('components/profiles/ProfileEditForm.tsx');
  const card = read('components/profiles/ProfileMiniCard.tsx');
  const vocabulary = read('lib/i18n/controlledVocabulary.ts');
  assert.match(form, /\['Destro', 'Sinistro', 'Ambidestro'\]/);
  assert.match(form, /localizePreferredSide\(value, t\)/);
  assert.match(card, /t\('profile\.preferredSide'\)/);
  assert.match(card, /localizePreferredSide\(p\?\.foot, t\)/);
  assert.match(vocabulary, /destro: 'vocabulary\.preferredSide\.right'/);
  assert.match(form, /new Intl\.DisplayNames\(locale, \{ type: 'region' \}\)/);
  assert.match(form, /countryDisplayNames\.of\(c\.code\) \|\| c\.name/);
});

test('Phase 5C smoke fixes structural event and opportunity copy', () => {
  const event = read('components/feed/EventPostHighlight.tsx');
  const opportunities = read('app/(dashboard)/opportunities/OpportunitiesClient.tsx');
  const table = read('components/opportunities/OpportunitiesTable.tsx');
  assert.doesNotMatch(event, />\s*Evento club\s*</);
  assert.match(event, /t\('feed\.clubEventHighlight'\)/);
  assert.match(opportunities, /t\('opportunities\.reverseOrder'\)/);
  assert.match(opportunities, /t\('opportunities\.deleteConfirm'/);
  assert.match(table, /t\('opportunities\.visitClubProfile'\)/);
});

test('Phase 5C smoke localizes Discover and Following controlled values', () => {
  for (const path of ['app/(dashboard)/discover/page.tsx', 'app/(dashboard)/following/page.tsx']) {
    const source = read(path);
    assert.match(source, /localizeSport/);
    assert.match(source, /localizeSportRole/);
    assert.match(source, /localizeAccountType/);
  }
});
