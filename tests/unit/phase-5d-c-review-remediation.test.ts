import assert from 'node:assert/strict';
import test from 'node:test';

import { SPORTS_ROLES } from '../../lib/opps/constants';
import { localizeSportRole } from '../../lib/i18n/controlledVocabulary';
import en from '../../lib/i18n/messages/vocabulary/en';
import es from '../../lib/i18n/messages/vocabulary/es';
import fr from '../../lib/i18n/messages/vocabulary/fr';
import completionEn from '../../lib/i18n/messages/completion/en';
import completionEs from '../../lib/i18n/messages/completion/es';
import completionFr from '../../lib/i18n/messages/completion/fr';
import type { VocabularyMessageKey } from '../../lib/i18n/messages/vocabulary/it';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const translator = (messages: Record<VocabularyMessageKey, string>) =>
  (key: VocabularyMessageKey) => messages[key];

const nonFootballSports = Object.entries(SPORTS_ROLES).filter(([sport]) =>
  !['Calcio', 'Calcio a 8'].includes(sport),
);

test('every non-football player role has an English, Spanish and French presentation label', () => {
  for (const [sport, roles] of nonFootballSports) {
    for (const role of roles) {
      const localized = localizeSportRole(role, translator(es));
      const validInternationalTerms = new Set(['Fixo', 'Universal', 'Flanker', 'Apertura', 'Centro', 'Centrocampista', 'Pitcher', 'Catcher', 'Lacrosse', 'Quarterback', 'Running back', 'Linebacker', 'Cornerback', 'Safety']);
      if (!validInternationalTerms.has(role)) {
        assert.notEqual(localized, role, `${sport}/${role} remained legacy Italian in es`);
      }
      assert.ok(localizeSportRole(role, translator(en)));
      assert.ok(localizeSportRole(role, translator(fr)));
    }
  }
});

test('Club Registry card uses localized copy and declares its Italy-only availability', () => {
  const page = readFileSync(resolve('app/(dashboard)/club/profile/page.tsx'), 'utf8');
  for (const key of ['eyebrow', 'claimTitle', 'claimBody', 'claimAction']) {
    assert.match(page, new RegExp(`club\\.registry\\.${key}`));
  }
  assert.doesNotMatch(page, />Rivendica la tua società</);
  assert.match(completionEn['club.registry.claimBody'], /only.*Italy|Italy.*only/i);
  assert.match(completionEs['club.registry.claimBody'], /solo.*Italia|Italia.*solo/i);
  assert.match(completionFr['club.registry.claimBody'], /uniquement.*Italie|Italie.*uniquement/i);
});

test('followed profiles sidebar localizes sport without changing the stored value', () => {
  const source = readFileSync(resolve('components/feed/FollowedClubs.tsx'), 'utf8');
  assert.match(source, /localizeSport\(item\.sport, t\)/);
  assert.match(source, /subtitle\(item, role, t\)/);
});
