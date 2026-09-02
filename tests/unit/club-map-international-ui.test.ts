import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const client = readFileSync('app/(dashboard)/club-map/ClubMapClient.tsx', 'utf8');

test('E4 ClubMap uses a European initial viewport and removes Italy-only constants', () => {
  assert.match(client, /EUROPE_CENTER/);
  assert.match(client, /EUROPE_BOUNDS/);
  assert.match(client, /minZoom: 2/);
  assert.doesNotMatch(client, /ITALY_CENTER|ITALY_BOUNDS/);
});

test('E4 canonical geography selection is URL-stable and sent to the bounded endpoint', () => {
  assert.match(client, /CanonicalGeographySelector/);
  assert.match(client, /searchParams\.get\('countryId'\)/);
  assert.match(client, /searchParams\.get\('geoAreaId'\)/);
  assert.match(client, /params\.set\('countryId', countryId\)/);
  assert.match(client, /params\.set\('geoAreaId', geoAreaId\)/);
  assert.match(client, /router\.replace\(query \? `\/club-map\?\$\{query\}`/);
  assert.match(client, /fetch\(`\/api\/clubs\/geolocated\$\{query\.size/);
});

test('E4 clusters markers without another provider or exposing personal points', () => {
  assert.match(client, /function clusterPins/);
  assert.match(client, /cp-club-map-cluster/);
  assert.match(client, /cluster\.pins\.length > 1/);
  assert.match(client, /Math\.min\(zoom \+ 2, 12\)/);
  assert.doesNotMatch(client, /markercluster|service_role|profile_preferences/i);
});

test('E4 popup values remain escaped and map states are localized', () => {
  assert.match(client, /escapeHtml\(pin\.name\)/);
  assert.match(client, /escapeHtml\(location\)/);
  assert.match(client, /escapeHtml\(pin\.id\)/);
  for (const key of ['map.filterHelp', 'map.ariaLabel', 'map.clusterLabel', 'map.loadError', 'map.unavailable']) {
    assert.match(client, new RegExp(key.replace('.', '\\.')));
  }
  for (const locale of ['it', 'en', 'fr', 'es']) {
    const messages = readFileSync(`lib/i18n/messages/operations/${locale}.ts`, 'utf8');
    assert.match(messages, /'map\.title'/);
    assert.match(messages, /'map\.filterHelp'/);
    assert.match(messages, /'map\.clusterLabel'/);
    assert.doesNotMatch(messages, /map\.title':'[^']*Itali/i);
  }
});

test('E4 delegates bounds-less canonical filtering to the server without zoom refetches', () => {
  assert.doesNotMatch(client, /VIEWPORT_BOUNDS_UNAVAILABLE|boundsUnavailable/);
  assert.doesNotMatch(client, /\[countryId, geoAreaId, t\]/);
});
