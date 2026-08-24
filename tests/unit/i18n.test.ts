import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { interpolateMessage, translateWithFallback } from '../../components/i18n/I18nProvider';
import { ACTIVE_LOCALES, resolveLocale } from '../../lib/i18n/config';
import { loadMessages } from '../../lib/i18n/messages';
import italianMessages from '../../lib/i18n/messages/it';
import {
  buildLanguagePreferenceInsert,
  buildLanguagePreferenceUpdate,
  buildLocaleCookie,
} from '../../lib/i18n/persistence';

test('locale detection follows profile, local, browser and Italian precedence', () => {
  assert.equal(resolveLocale({}), 'it');
  for (const locale of ['it', 'en', 'fr', 'es'] as const) {
    assert.equal(resolveLocale({ browserLocale: locale }), locale);
  }
  assert.equal(resolveLocale({ browserLocale: 'es-MX' }), 'es');
  assert.equal(resolveLocale({ browserLocale: 'fr-CH' }), 'fr');
  assert.equal(resolveLocale({ browserLocale: 'de-DE' }), 'it');
  assert.equal(resolveLocale({ localLocale: 'en', browserLocale: 'fr' }), 'en');
  assert.equal(resolveLocale({ profileLocale: 'es', localLocale: 'en', browserLocale: 'fr' }), 'es');
});

test('switcher exposes only active and supported languages', () => {
  assert.deepEqual(ACTIVE_LOCALES, ['it', 'en', 'fr', 'es']);
  assert.ok(!ACTIVE_LOCALES.includes('pt' as never));
  assert.ok(!ACTIVE_LOCALES.includes('de' as never));
});

test('anonymous choice produces a durable, same-site locale cookie', () => {
  assert.equal(buildLocaleCookie('fr', false), 'cp_locale=fr; Path=/; Max-Age=31536000; SameSite=Lax');
  assert.match(buildLocaleCookie('es', true), /; Secure$/);
});

test('authenticated preference writes never overwrite residence or relocation', () => {
  assert.deepEqual(buildLanguagePreferenceUpdate('language-id'), { preferred_language_id: 'language-id' });
  assert.deepEqual(buildLanguagePreferenceInsert('profile-id', 'language-id'), {
    profile_id: 'profile-id',
    preferred_language_id: 'language-id',
  });
  for (const payload of [buildLanguagePreferenceUpdate('x'), buildLanguagePreferenceInsert('p', 'x')]) {
    assert.ok(!('residence_country_id' in payload));
    assert.ok(!('open_to_relocation' in payload));
  }
});

test('missing profile preferences remain a valid locale input', () => {
  assert.equal(resolveLocale({ profileLocale: null, localLocale: null, browserLocale: 'en-GB' }), 'en');
});

test('all active dictionaries contain every required Italian key', async () => {
  const requiredKeys = Object.keys(italianMessages).sort();
  for (const locale of ACTIVE_LOCALES) {
    const messages = await loadMessages(locale);
    assert.deepEqual(Object.keys(messages).sort(), requiredKeys, `dictionary ${locale}`);
  }
});

test('French and Spanish use localized primary feed copy rather than English placeholders', async () => {
  const english = await loadMessages('en');
  for (const locale of ['fr', 'es'] as const) {
    const messages = await loadMessages(locale);
    for (const key of [
      'feed.whoToFollow', 'feed.suggestedForYou', 'feed.followedProfiles', 'feed.highlights',
      'feed.react', 'feed.comment', 'feed.noComments', 'feed.addComment', 'feed.writeUpdate',
      'notifications.empty', 'messages.empty', 'settings.title',
    ] as const) {
      assert.notEqual(messages[key], english[key], `${locale}:${key}`);
    }
  }
});

test('preview-reported primary feed labels are no longer hardcoded in target components', () => {
  const targets = [
    '../../components/feed/WhoToFollow.tsx', '../../components/feed/FollowedClubs.tsx',
    '../../components/feed/FeedHighlights.tsx', '../../components/feed/FeedComposer.tsx',
    '../../components/feed/PostCard.tsx', '../../components/feed/CommentsSection.tsx',
    '../../app/(dashboard)/feed/page.tsx',
  ];
  const source = targets.map((target) => readFileSync(new URL(target, import.meta.url), 'utf8')).join('\n');
  for (const legacyLabel of [
    'Chi seguire', 'Suggeriti per te', 'Profili che segui', 'Gestisci / vedi tutte le opportunità',
    '>Reagisci<', '>Commenta<', 'Nessun commento', 'Mostra commenti', 'Aggiungi un commento',
    'Scrivi un aggiornamento per la community',
  ]) {
    assert.ok(!source.includes(legacyLabel), legacyLabel);
  }
});

test('phase 2B.2 operational routes no longer hardcode their reported Italian headings and controls', () => {
  const targets = [
    '../../app/(dashboard)/discover/page.tsx', '../../app/(dashboard)/following/page.tsx',
    '../../app/(dashboard)/club/roster/page.tsx', '../../app/(dashboard)/club/staff/page.tsx',
    '../../app/(dashboard)/opportunities/OpportunitiesClient.tsx', '../../components/opportunities/OpportunitiesTable.tsx',
    '../../components/applications/ReceivedApplicationsPage.tsx', '../../app/(dashboard)/club-map/ClubMapClient.tsx',
    '../../app/(dashboard)/club/profile/page.tsx', '../../components/profiles/ClubProfileDetails.tsx',
    '../../components/ads/AdSlot.tsx',
  ];
  const source = targets.map((target) => readFileSync(new URL(target, import.meta.url), 'utf8')).join('\n');
  for (const label of [
    'Scopri profili', 'Ambito geografico', 'Provincia di interesse', 'Solo il mio sport',
    'Club and Player che segui', 'Nessun membro dello staff ancora aggiunto.', 'Cerca per titolo/descrizione…',
    'Nome club/squadra', 'Totale risultati', 'Club unici', 'Area prevalente', 'Pubblicata il ',
    'Dettagli annuncio', 'Candidature ricevute', 'Club geolocalizzati in Italia',
    'Sei un Club? Imposta la geolocalizzazione', 'Modifica dati club', '>Sponsored<',
  ]) assert.ok(!source.includes(label), label);
});

test('missing translation keys fall back safely', async () => {
  const english = await loadMessages('en');
  assert.equal(translateWithFallback('common.save', {}, italianMessages), 'Salva');
  assert.equal(translateWithFallback('unknown.key', english, italianMessages), 'unknown.key');
  assert.equal(interpolateMessage('Hello {name}', { name: 'Alex' }), 'Hello Alex');
});

test('phase 2B adds no migration and keeps the two applied European migrations', () => {
  const migrationDirectory = new URL('../../supabase/migrations/', import.meta.url);
  const phaseMigrations = readdirSync(migrationDirectory).filter((name) => name.includes('european_'));
  assert.deepEqual(phaseMigrations, [
    '20260822120000_european_catalog_foundation.sql',
    '20260822130000_european_profile_preferences.sql',
  ]);

  const persistenceSource = readFileSync(new URL('../../lib/i18n/persistence.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(persistenceSource, /service[_-]?role/i);
  assert.match(persistenceSource, /\.update\(buildLanguagePreferenceUpdate\(language\.id\)\)/);
  assert.match(persistenceSource, /\.insert\(buildLanguagePreferenceInsert\(profile\.id, language\.id\)\)/);
});
