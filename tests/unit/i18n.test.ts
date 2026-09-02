import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { ACTIVE_LOCALES, resolveLocale } from '../../lib/i18n/config';
import { loadMessages } from '../../lib/i18n/messages';
import italianMessages from '../../lib/i18n/messages/it';
import { interpolateMessage, translateWithFallback } from '../../lib/i18n/translate';
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


test('completion gate derives every App Router page from the filesystem', async () => {
  const { classifyAppRouterFile, appPageFileToRoute } = await import('../../lib/i18n/userFacingInventory');
  const appDirectory = new URL('../../app/', import.meta.url);
  const walk = (directory: URL): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    return entry.isDirectory() ? walk(child) : entry.name === 'page.tsx' ? [child.pathname.split('/app/')[1]] : [];
  });
  const files = walk(appDirectory).map((relative) => `app/${relative}`).sort();
  assert.ok(files.length >= 80, `route inventory unexpectedly small: ${files.length}`);
  for (const file of files) {
    const type = classifyAppRouterFile(file);
    assert.ok(type, file);
    assert.ok(appPageFileToRoute(file).startsWith('/'), file);
  }
  for (const required of ['app/sponsor/page.tsx', 'app/reset-password/page.tsx', 'app/update-password/page.tsx', 'app/(dashboard)/opportunities/[id]/applications/page.tsx']) {
    assert.equal(classifyAppRouterFile(required), 'USER-FACING', required);
    assert.ok(files.includes(required), required);
  }
});

test('completion gate rejects literal translation syntax and hardcoded Italian locale in ordinary UI', () => {
  const roots = [new URL('../../app/', import.meta.url), new URL('../../components/', import.meta.url)];
  const excluded = /\/(?:admin|registry|verification|legal)\//;
  const walk = (directory: URL): URL[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    return entry.isDirectory() ? walk(child) : /\.(?:ts|tsx)$/.test(entry.name) ? [child] : [];
  });
  for (const file of roots.flatMap(walk).filter((url) => !excluded.test(url.pathname))) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\{\{\s*t\s*\(/i, file.pathname);
    assert.doesNotMatch(source, /['"]it-IT['"]/, file.pathname);
  }
});

test('reported completion surfaces contain no hardcoded Italian UI copy', () => {
  const targets = [
    '../../app/(dashboard)/club-map/ClubMapClient.tsx', '../../app/sponsor/page.tsx',
    '../../app/(dashboard)/opportunities/[id]/page.tsx', '../../app/(dashboard)/opportunities/[id]/applications/page.tsx',
    '../../components/profiles/ProfileEditForm.tsx', '../../components/profiles/ClubStadiumMapPicker.tsx',
    '../../app/reset-password/page.tsx', '../../app/update-password/page.tsx',
  ];
  const source = targets.map((target) => readFileSync(new URL(target, import.meta.url), 'utf8')).join('\n');
  for (const forbidden of [
    '>{t(\'common.visitClub\')}<', 'Sponsorizza la tua attività', 'Configura il tuo preventivo',
    'Posizione del Club sulla mappa nazionale', 'Cerca sede, stadio o impianto', 'Usa la mia posizione',
    'Profilo pubblicato', 'Il profilo è visibile nelle pagine pubbliche', 'Candidature ricevute',
    'Reimposta password', 'Imposta nuova password',
  ]) assert.ok(!source.includes(forbidden), forbidden);
});

test('phase 4C primary network, applications and location surfaces use the Italian catalog baseline', () => {
  const targets = [
    '../../components/network/NetworkPage.tsx',
    '../../components/applications/MyApplications.tsx',
    '../../components/applications/ApplicationsDashboard.tsx',
    '../../components/applications/ApplicationsTable.tsx',
    '../../components/opportunities/OpportunityDetailClient.tsx',
    '../../components/opportunities/ApplyCell.tsx',
    '../../app/profile/location-settings/page.tsx',
  ];
  const source = targets.map((target) => readFileSync(new URL(target, import.meta.url), 'utf8')).join('\n');
  for (const hardcodedLabel of [
    '>La tua rete<', '>Visita profilo<', '>Nessun risultato da mostrare.<',
    '>Caricamento suggerimenti…<', '>Nessuna candidatura inviata<', '>Apri annuncio<',
    '>Ritira candidatura<', '>Tutti gli stati<', '>Solo Player/Staff<',
    '>Annuncio non trovato.<', '>Questa pagina è stata spostata.<',
  ]) assert.ok(!source.includes(hardcodedLabel), hardcodedLabel);
});

test('phase 4D English baseline is explicit on primary product surfaces', async () => {
  const english = await loadMessages('en');
  const approved = {
    'network.title': 'Your network',
    'network.suggested': 'Suggested',
    'network.following': 'Following',
    'network.followers': 'Followers',
    'applications.mine': 'My applications',
    'applications.status': 'Status',
    'applications.date': 'Date',
    'applications.actions': 'Actions',
    'opportunities.details': 'Listing details',
    'opportunity.notFound': 'Opportunity not found.',
    'profile.location': 'Location',
  } as const;
  for (const [key, value] of Object.entries(approved)) {
    assert.equal(english[key as keyof typeof english], value, key);
    assert.notEqual(english[key as keyof typeof english], italianMessages[key as keyof typeof italianMessages], key);
  }
});

test('application detail CTA remains one responsive unit for longer translations', () => {
  const source = readFileSync(new URL('../../app/(dashboard)/applications/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /min-w-max items-center justify-center whitespace-nowrap/);
  assert.match(source, /w-full items-center justify-center whitespace-nowrap/);
  assert.match(source, /t\('applications\.date'\)/);
  assert.match(source, /t\('applications\.actions'\)/);
  assert.doesNotMatch(source, />Data</);
  assert.doesNotMatch(source, />Azione</);
});

test('phase 4E French baseline is explicit and free of the reviewed Italian and English copy', async () => {
  const french = await loadMessages('fr');
  const approved = {
    'network.title': 'Votre réseau',
    'network.suggested': 'Suggestions',
    'applications.mine': 'Mes candidatures',
    'applications.playerStaffOnly': 'Joueurs et Staff uniquement',
    'applications.date': 'Date',
    'applications.actions': 'Actions',
    'opportunities.details': 'Détails de l’annonce',
    'opportunities.role': 'Rôle ou poste',
    'opportunity.notFound': 'Opportunité introuvable.',
    'profile.location': 'Localité',
    'filters.searchPlaceholder': 'Rechercher (ex. Paris, Club, rôle…)',
  } as const;
  for (const [key, value] of Object.entries(approved)) {
    assert.equal(french[key as keyof typeof french], value, key);
  }
  assert.equal(french['applications.subtitle'], 'Gérez les candidatures reçues pour les opportunités du Club.');
  assert.equal(french['feed.manageOpportunities'], 'Gérer ou voir toutes les opportunités');
  assert.equal(french['common.betaInfo'], 'Informations sur la version bêta');
});


test('missing translation keys fall back safely', async () => {
  const english = await loadMessages('en');
  assert.equal(translateWithFallback('common.save', {}, italianMessages), 'Salva');
  assert.equal(translateWithFallback('unknown.key', english, italianMessages), 'unknown.key');
  assert.equal(interpolateMessage('Hello {name}', { name: 'Alex' }), 'Hello Alex');
  assert.equal(interpolateMessage('Hello {name}, {missing}', { name: 'Alex' }), 'Hello Alex, {missing}');
  assert.equal(
    translateWithFallback('auth.loggedAs', {}, italianMessages, { email: 'utente@example.test' }),
    'Sei loggato come utente@example.test.',
  );
});

test('keeps the two applied Phase 1/2 migrations and admits only the Phase 3A foundation', () => {
  const migrationDirectory = new URL('../../supabase/migrations/', import.meta.url);
  const phaseMigrations = readdirSync(migrationDirectory).filter((name) => name.includes('european_'));
  assert.deepEqual(phaseMigrations, [
    '20260822120000_european_catalog_foundation.sql',
    '20260822130000_european_profile_preferences.sql',
    '20260824120000_european_geo_area_foundation.sql',
  ]);

  const persistenceSource = readFileSync(new URL('../../lib/i18n/persistence.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(persistenceSource, /service[_-]?role/i);
  assert.match(persistenceSource, /\.update\(buildLanguagePreferenceUpdate\(language\.id\)\)/);
  assert.match(persistenceSource, /\.insert\(buildLanguagePreferenceInsert\(profile\.id, language\.id\)\)/);
});
