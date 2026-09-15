import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sponsor = readFileSync('app/sponsor/page.tsx', 'utf8');
const legalDocument = readFileSync('components/legal/LocalizedLegalDocument.tsx', 'utf8');

test('Sponsor uses the supported-country canonical cascading geography selector', () => {
  assert.match(sponsor, /CanonicalGeographySelector/);
  assert.match(sponsor, /countryId=\{countryId\}/);
  assert.match(sponsor, /geoAreaId=\{geoAreaId\}/);
  assert.match(sponsor, /onCountryChange=/);
  assert.match(sponsor, /onGeoAreaChange=/);
  assert.doesNotMatch(sponsor, /fetchLocationChildren/);
});

test('all legal documents provide visible copy for every selectable locale', () => {
  for (const locale of ['it', 'en', 'fr', 'es']) assert.match(legalDocument, new RegExp(`\\b${locale}:`));
  for (const kind of ['privacy', 'terms', 'beta', 'childSafety']) {
    assert.ok(legalDocument.split(`${kind}:`).length >= 5, `${kind} must exist in all four locales`);
  }
  assert.match(legalDocument, /documents\[locale\]\[kind\]/);
  assert.match(legalDocument, /Intl\.DateTimeFormat\(locale\)/);
});

test('each legal route renders the shared localized document', () => {
  for (const route of ['privacy', 'terms', 'beta', 'child-safety']) {
    const page = readFileSync(`app/legal/${route}/page.tsx`, 'utf8');
    assert.match(page, /LocalizedLegalDocument/);
  }
});

test('authenticated legal pages reuse the same role-aware application menu as the dashboard', () => {
  const layout = readFileSync('app/legal/layout.tsx', 'utf8');
  assert.match(layout, /if \(user\) \{[\s\S]*return <AppShell>\{children\}<\/AppShell>/);
  assert.doesNotMatch(layout, /LegalNavbar/);
  assert.match(layout, /<MarketingNavbar \/>/);
});
