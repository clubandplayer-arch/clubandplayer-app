import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Source = {
  id: string;
  country: string;
  url: string;
  classification: string;
  verificationState: string;
  httpStatus: number | null;
  retrievalSha256: string | null;
};

type CatalogEntry = {
  country: string;
  code: string;
  codeAuthority: string;
  officialName: string;
  commercialNames: string[];
  documentedAliases: string[];
  organizer: { code: string; codeAuthority: string; name: string };
  territory: { code: string; codeAuthority: string; name: string } | null;
  scope: string;
  levelRank: number | null;
  rankCondition: string | null;
  targetSeason: string;
  recordKind: string;
  evidenceState: string;
  sourceRefs: string[];
  selectorEligibleAfterReview: boolean;
  notes: string | null;
};

const evidence = JSON.parse(readFileSync(resolve(
  'data/sports/evidence/phase-6c-football-six-country-evidence-pack.json',
), 'utf8')) as {
  schemaVersion: number;
  evidencePackVersion: string;
  targetSeason: string;
  priorRetrievals: Array<{ country: string; httpStatus: number; retrievalSha256: string | null }>;
  handoffSources: Source[];
  humanReviewSources: Source[];
  humanReviewReport: {
    provenance: string;
    notEquivalentToAgentRetrieval: boolean;
    italyBaselineCertainty: string;
    france: string;
    catalonia: string;
    switzerland: string;
    slovenia: string;
    polandDzpn: string;
  };
  reuseAssessment: { automaticImportAllowed: boolean; factualReviewCatalogAllowed: boolean };
  decision: {
    status: string;
    mayCreateSeedOrMigration: boolean;
    mayConnectRuntimeSelector: boolean;
    mayPromoteToProduction: boolean;
  };
};

const catalog = JSON.parse(readFileSync(resolve(
  'data/sports/phase-6c-football-level-review-catalog.json',
), 'utf8')) as {
  schemaVersion: number;
  catalogVersion: string;
  humanReviewRecordedAt: string;
  targetSeason: string;
  sportCode: string;
  disciplineCode: string;
  displayPolicy: string;
  codePolicy: string;
  importAuthorized: boolean;
  runtimeAuthorized: boolean;
  productionAuthorized: boolean;
  historicalIdentities: Array<{
    country: string;
    code: string;
    previousEvidenceSeason: string;
    mappingState: string;
    doNotReuseAsCode: string;
    mappedToReviewCode: string;
  }>;
  entries: CatalogEntry[];
};

const launchCountries = ['CH', 'ES', 'FR', 'IT', 'PL', 'SI'];
const byCode = (country: string, code: string) => {
  const entry = catalog.entries.find((item) => item.country === country && item.code === code);
  assert.ok(entry, `missing ${country}:${code}`);
  return entry;
};

test('v3 evidence preserves prior retrievals and does not fabricate retrieval results for handoff or human-review URLs', () => {
  assert.equal(evidence.schemaVersion, 2);
  assert.match(evidence.evidencePackVersion, /football-six-country\.3$/);
  assert.equal(evidence.targetSeason, '2026/27');
  assert.deepEqual(evidence.priorRetrievals.map((item) => item.country).sort(), launchCountries);
  assert.ok(evidence.priorRetrievals.some((item) => item.httpStatus === 200 && item.retrievalSha256));
  assert.ok(evidence.priorRetrievals.some((item) => item.httpStatus === 403 && item.retrievalSha256 === null));
  assert.ok(evidence.handoffSources.length > launchCountries.length);
  for (const source of evidence.handoffSources) {
    assert.match(source.url, /^https:\/\//);
    assert.equal(source.verificationState, 'handoff_reported_not_retrieved_in_this_update');
    assert.equal(source.httpStatus, null);
    assert.equal(source.retrievalSha256, null);
  }
  assert.ok(evidence.humanReviewSources.length > 0);
  for (const source of evidence.humanReviewSources) {
    assert.equal(source.verificationState, 'user_reported_human_review');
    assert.equal(source.httpStatus, null);
    assert.equal(source.retrievalSha256, null);
  }
  assert.equal(evidence.humanReviewReport.provenance, 'user_supplied_2026-09-11');
  assert.equal(evidence.humanReviewReport.notEquivalentToAgentRetrieval, true);
  const allSourceIds = [...evidence.handoffSources, ...evidence.humanReviewSources].map((source) => source.id);
  assert.equal(new Set(allSourceIds).size, allSourceIds.length);
});

test('catalog keys every identity by country and internal code and never localizes official names', () => {
  assert.equal(catalog.schemaVersion, 2);
  assert.match(catalog.catalogVersion, /football-level-review\.3$/);
  assert.equal(catalog.humanReviewRecordedAt, '2026-09-11');
  assert.equal(catalog.targetSeason, '2026/27');
  assert.equal(catalog.sportCode, 'football');
  assert.equal(catalog.disciplineCode, 'association_football');
  assert.equal(catalog.displayPolicy, 'official_name_is_not_translated_by_ui_locale');
  assert.match(catalog.codePolicy, /internal review codes/);
  assert.deepEqual([...new Set(catalog.entries.map((entry) => entry.country))].sort(), launchCountries);
  const keys = catalog.entries.map((entry) => `${entry.country}:${entry.code}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const entry of catalog.entries) {
    assert.match(entry.code, /^[a-z][a-z0-9_]*$/);
    assert.equal(entry.codeAuthority, 'clubandplayer_internal_review');
    assert.equal(entry.organizer.codeAuthority, 'clubandplayer_internal_review');
    assert.equal(entry.territory?.codeAuthority ?? 'clubandplayer_internal_review', 'clubandplayer_internal_review');
    assert.equal(entry.targetSeason, '2026/27');
    assert.equal('localizedNames' in entry, false);
  }
});

test('Italy preserves the product-owner-confirmed baseline with absolute ranks 4 through 9', () => {
  const italyCodes = ['serie_d', 'eccellenza', 'promozione', 'prima_categoria', 'seconda_categoria', 'terza_categoria'];
  assert.deepEqual(italyCodes.map((code) => byCode('IT', code).levelRank), [4, 5, 6, 7, 8, 9]);
  for (const code of italyCodes) {
    const entry = byCode('IT', code);
    assert.equal(entry.evidenceState, 'human_confirmed_product_baseline');
    assert.equal(entry.selectorEligibleAfterReview, true);
  }
});

test('France preserves old identities while representing the reported 2026/27 structure separately', () => {
  assert.deepEqual(catalog.historicalIdentities.map((item) => item.code).sort(), ['national', 'national_2', 'national_3']);
  for (const historical of catalog.historicalIdentities) {
    assert.equal(historical.country, 'FR');
    assert.equal(historical.previousEvidenceSeason, '2025/26');
    assert.notEqual(historical.code, historical.doNotReuseAsCode);
  }
  const historicalByCode = new Map(catalog.historicalIdentities.map((item) => [item.code, item]));
  assert.equal(historicalByCode.get('national')?.mappedToReviewCode, 'ligue_3');
  assert.equal(historicalByCode.get('national')?.mappingState, 'explicit_ex_national_in_2026_27_ligue_3_regulation');
  assert.equal(historicalByCode.get('national_2')?.mappedToReviewCode, 'national_1');
  assert.match(historicalByCode.get('national_2')?.mappingState ?? '', /inferred_from_seasonal_structure/);
  assert.equal(historicalByCode.get('national_3')?.mappedToReviewCode, 'national_2_2026_27');
  assert.equal(byCode('FR', 'ligue_3').levelRank, 3);
  assert.deepEqual(byCode('FR', 'ligue_3').commercialNames, ['Ligue 3 Betclic']);
  assert.equal(byCode('FR', 'national_1').levelRank, 4);
  assert.equal(byCode('FR', 'national_2_2026_27').levelRank, 5);
  assert.ok(['ligue_3', 'national_1', 'national_2_2026_27'].every((code) => byCode('FR', code).selectorEligibleAfterReview));
  assert.deepEqual(['regional_1', 'regional_2', 'regional_3'].map((code) => byCode('FR', code).levelRank), [6, 7, 8]);
  for (let level = 1; level <= 7; level += 1) {
    const entry = byCode('FR', `departemental_${level}_template`);
    assert.equal(entry.recordKind, 'territorial_template');
    assert.equal(entry.levelRank, null);
    assert.match(entry.organizer.code, /district_required/);
  }
});

test('Spain removes generic regional identities and scopes the Catalan sequence to FCF and Catalunya', () => {
  assert.equal(catalog.entries.some((entry) => entry.country === 'ES' && entry.code.startsWith('regional_')), false);
  assert.deepEqual(
    ['primera_federacion', 'segunda_federacion', 'tercera_federacion'].map((code) => byCode('ES', code).levelRank),
    [3, 4, 5],
  );
  const catalanCodes = ['lliga_elit', 'primera_catalana', 'segona_catalana', 'tercera_catalana', 'quarta_catalana'];
  assert.deepEqual(catalanCodes.map((code) => byCode('ES', code).levelRank), [6, 7, 8, 9, 10]);
  for (const code of catalanCodes) {
    const entry = byCode('ES', code);
    assert.equal(entry.organizer.code, 'fcf');
    assert.equal(entry.territory?.code, 'ES-CT');
  }
  assert.equal(byCode('ES', 'tercera_catalana').evidenceState, 'human_verified_2026_27_hierarchy_derived_rank');
  assert.equal(byCode('ES', 'quarta_catalana').selectorEligibleAfterReview, true);
});

test('Switzerland uses 1. Liga as the base name and keeps regional rows as organizer-required templates', () => {
  assert.equal(byCode('CH', 'promotion_league').officialName, 'Promotion League');
  assert.deepEqual(byCode('CH', 'promotion_league').commercialNames, ['Hoval Promotion League']);
  assert.equal(byCode('CH', 'first_liga').officialName, '1. Liga');
  assert.deepEqual(byCode('CH', 'first_liga').documentedAliases, ['1. Liga Classic']);
  assert.equal(byCode('CH', 'first_liga').evidenceState, 'human_verified_2026_27_same_competition_alias');
  assert.match(byCode('CH', 'first_liga').notes ?? '', /Cup-Qualifikation/);
  assert.equal(catalog.entries.some((entry) => entry.code === 'first_liga_classic'), false);
  for (const rank of [6, 7, 8, 9]) {
    const entry = catalog.entries.find((item) => item.country === 'CH' && item.levelRank === rank);
    assert.equal(entry?.recordKind, 'territorial_template');
    assert.match(entry?.organizer.code ?? '', /regional_association_required/);
  }
});

test('Slovenian fourth-level names are parallel organizer candidates rather than sequential ranks', () => {
  const regional = catalog.entries.filter((entry) => entry.country === 'SI' && entry.scope === 'regional');
  assert.equal(regional.length, 6);
  assert.ok(regional.every((entry) => entry.levelRank === 4));
  assert.equal(new Set(regional.map((entry) => entry.organizer.code)).size, regional.length);
  assert.equal(catalog.entries.some((entry) => entry.country === 'SI' && entry.officialName === 'Divisioni inferiori MNZ'), false);
  assert.equal(catalog.entries.some((entry) => entry.country === 'SI' && entry.code === 'medobcinska_liga'), false);
  assert.equal(byCode('SI', 'gorenjska_nogometna_liga').officialName, 'GNL - člani');
  assert.deepEqual(byCode('SI', 'gorenjska_nogometna_liga').documentedAliases, ['Gorenjska nogometna liga']);
  assert.deepEqual(byCode('SI', 'prva_clanska_liga_mnz_maribor').commercialNames, ['Golgeter Premium liga']);
  assert.equal(regional.filter((entry) => entry.selectorEligibleAfterReview).length, 3);
  assert.equal(regional.filter((entry) => entry.evidenceState === 'human_review_not_confirmed_no_negative_inference').length, 3);
});

test('Poland models optional V liga and lower classes without inventing one absolute rank', () => {
  assert.equal(byCode('PL', 'third_liga').levelRank, 4);
  assert.deepEqual(byCode('PL', 'third_liga').commercialNames, ['Betclic 3. Liga']);
  assert.equal(byCode('PL', 'fourth_liga_dzpn').levelRank, 5);
  assert.equal(byCode('PL', 'fourth_liga_dzpn').officialName, '4. Liga dolnośląska');
  assert.equal(byCode('PL', 'fourth_liga_dzpn').organizer.code, 'dzpn');
  assert.deepEqual(
    ['klasa_okregowa_dzpn', 'klasa_a_dzpn', 'klasa_b_dzpn'].map((code) => byCode('PL', code).levelRank),
    [6, 7, 8],
  );
  assert.ok(['fourth_liga_dzpn', 'klasa_okregowa_dzpn', 'klasa_a_dzpn', 'klasa_b_dzpn']
    .every((code) => byCode('PL', code).selectorEligibleAfterReview));
  for (const code of ['fifth_liga_template', 'klasa_okregowa_template', 'klasa_a_template', 'klasa_b_template', 'klasa_c_template']) {
    const entry = byCode('PL', code);
    assert.equal(entry.levelRank, null);
    assert.equal(entry.recordKind, 'territorial_template');
    assert.ok(entry.rankCondition);
    assert.equal(entry.selectorEligibleAfterReview, false);
  }
});

test('all uncertain territorial records remain non-selectable and every source reference resolves', () => {
  const sourceIds = new Set([...evidence.handoffSources, ...evidence.humanReviewSources].map((source) => source.id));
  for (const entry of catalog.entries) {
    for (const sourceRef of entry.sourceRefs) assert.ok(sourceIds.has(sourceRef), `${entry.code}:${sourceRef}`);
    if (entry.recordKind === 'territorial_template' || /pending|partial|candidate|unverified|not_confirmed/.test(entry.evidenceState)) {
      assert.equal(entry.selectorEligibleAfterReview, false);
    }
  }
});

test('6C remains review-only, Preview-bound and cannot authorize later phases or Production', () => {
  assert.equal(evidence.reuseAssessment.automaticImportAllowed, false);
  assert.equal(evidence.decision.mayCreateSeedOrMigration, false);
  assert.equal(evidence.decision.mayConnectRuntimeSelector, false);
  assert.equal(evidence.decision.mayPromoteToProduction, false);
  assert.equal(catalog.importAuthorized, false);
  assert.equal(catalog.runtimeAuthorized, false);
  assert.equal(catalog.productionAuthorized, false);
});
