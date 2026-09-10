import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { localizeCountryOption } from '../../lib/i18n/countryDisplayName';

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
  assert.match(form, /localizeCountryOption\(c\.code, c\.name, locale/);
  assert.equal(localizeCountryOption('IT', 'Italia', 'en', 'Other'), 'Italy');
  assert.equal(localizeCountryOption('OTHER', 'Altro…', 'en', 'Other'), 'Other');
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

test('Phase 5C smoke localizes Institution edit and public Player details', () => {
  const form = read('components/profiles/ProfileEditForm.tsx');
  const player = read('app/(dashboard)/players/[id]/page.tsx');
  const experiences = read('components/athletes/AthleteExperiencesSection.tsx');
  const miniCard = read('components/profiles/ProfileMiniCard.tsx');
  assert.match(form, /isInstitution \? t\('profile\.institution'\) : 'Club'/);
  assert.match(form, /searchLabel: t\('stadium\.search'\)/);
  assert.match(player, /localizeSportRole\(profile\.role, t\)/);
  assert.match(player, /localizeSport\(normalizeSport/);
  assert.match(experiences, /localizeOpportunityCategory\(exp\.category, t\)/);
  assert.match(experiences, /localizeSport\(exp\.sport, t\)/);
  assert.doesNotMatch(miniCard, /createClient as createSupabaseClient/);
  assert.match(miniCard, /supabaseBrowser\(\)/);
});

test('Phase 5C smoke localizes public Club controlled values and country only', () => {
  const club = read('app/(dashboard)/clubs/[id]/page.tsx');
  assert.match(club, /localizeSport\(normalizeSport/);
  assert.match(club, /localizeOpportunityCategory\(profileWithVerification\.club_league_category, t\)/);
  assert.match(club, /localizeCountryOption\(rawCountry/);
  assert.match(club, /row\.city, provinceDisplayValue\(row\.province/);
});
