import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const catalog = JSON.parse(readFileSync(resolve(
  'data/sports/phase-6c-bis-italy-football-organizer-review-catalog.json',
), 'utf8')) as {
  country: string;
  sportCode: string;
  disciplineCode: string;
  importAuthorized: boolean;
  runtimeAuthorized: boolean;
  productionAuthorized: boolean;
  cascadePolicy: {
    steps: string[];
    organizationSelector: string;
    optionSelector: string;
    singleOrganizationBehavior: string;
    zeroOptionBehavior: string;
    countrySource: string;
    localeAffectsOfficialNames: boolean;
  };
  legacyMovePlan: {
    removeFromFlatFootballCategoryMenu: string[];
    keepAsLndLevels: string[];
    organizationMenuOrder: string[];
    neverCreateStandaloneOrganization: string[];
    notApplicableToFootballUntilResolved: string[];
  };
  organizations: Array<{
    code: string;
    officialName: string;
    displayOrder: number;
    selectorEligibleAfterReview: boolean;
  }>;
  options: Array<{
    organizationCode: string;
    code: string;
    officialName: string;
    optionKind: string;
    displayOrder: number;
    levelRank: number | null;
    targetSeason: string | null;
    selectorEligibleAfterReview: boolean;
  }>;
};

const optionsFor = (organizationCode: string) => catalog.options
  .filter((option) => option.organizationCode === organizationCode)
  .sort((left, right) => left.displayOrder - right.displayOrder);

test('cascade is country+sport driven and hides redundant controls for simpler countries', () => {
  assert.equal(catalog.country, 'IT');
  assert.equal(catalog.sportCode, 'football');
  assert.equal(catalog.disciplineCode, 'association_football');
  assert.deepEqual(catalog.cascadePolicy.steps, ['sport', 'organization', 'organization_option']);
  assert.match(catalog.cascadePolicy.organizationSelector, /more_than_one_applicable_organization/);
  assert.equal(catalog.cascadePolicy.singleOrganizationBehavior, 'auto_select_and_omit_redundant_organization_control');
  assert.equal(catalog.cascadePolicy.zeroOptionBehavior, 'omit_option_control');
  assert.equal(catalog.cascadePolicy.countrySource, 'explicit_selected_context_country');
  assert.equal(catalog.cascadePolicy.localeAffectsOfficialNames, false);
});

test('LND is first and owns the six senior levels plus youth-only ELITE and Giovanili', () => {
  assert.equal(catalog.organizations[0].code, 'lnd');
  assert.equal(catalog.organizations[0].officialName, 'LND');
  const lnd = optionsFor('lnd');
  assert.deepEqual(lnd.map((option) => option.officialName), [
    'Serie D', 'Eccellenza', 'Promozione', 'Prima Categoria',
    'Seconda Categoria', 'Terza Categoria', 'ELITE', 'Giovanili',
  ]);
  assert.deepEqual(lnd.slice(0, 6).map((option) => option.levelRank), [4, 5, 6, 7, 8, 9]);
  assert.equal(lnd[6].optionKind, 'youth_competition_label');
  assert.equal(lnd[6].levelRank, null);
  assert.equal(lnd[7].optionKind, 'youth_umbrella');
  assert.equal(lnd[7].levelRank, null);

  assert.deepEqual(catalog.organizations.filter((organization) => organization.officialName === 'ELITE'), []);
  assert.deepEqual(catalog.options.filter((option) => option.officialName === 'ELITE').map((option) => option.organizationCode), ['lnd']);
  assert.deepEqual(catalog.options.filter((option) => option.officialName === 'Giovanili').map((option) => option.organizationCode), ['lnd']);
});

test('legacy flat values move to organizations without losing the LND level baseline', () => {
  const lndLevels = [
    'Serie D', 'Eccellenza', 'Promozione', 'Prima Categoria', 'Seconda Categoria', 'Terza Categoria',
  ];
  assert.deepEqual(catalog.legacyMovePlan.keepAsLndLevels, lndLevels);
  for (const value of [...lndLevels, 'E.I.F.A.', 'CSI', 'UISP', 'CSEN', 'AICS', 'OPES', 'ASC', 'ENDAS', 'PGS', 'US ACLI', 'FIP', 'ELITE', 'Giovanili']) {
    assert.ok(catalog.legacyMovePlan.removeFromFlatFootballCategoryMenu.includes(value));
  }
  assert.deepEqual(catalog.legacyMovePlan.neverCreateStandaloneOrganization, ['ELITE']);
});

test('every option belongs to one declared organization and native names have no locale variants', () => {
  const organizationCodes = new Set(catalog.organizations.map((organization) => organization.code));
  assert.equal(new Set(catalog.organizations.map((organization) => organization.displayOrder)).size, catalog.organizations.length);
  const optionKeys = new Set<string>();
  for (const option of catalog.options) {
    assert.ok(organizationCodes.has(option.organizationCode));
    const key = `${option.organizationCode}:${option.code}`;
    assert.equal(optionKeys.has(key), false, key);
    optionKeys.add(key);
    assert.equal('localizedNames' in option, false);
  }
});

test('PGS keeps only 11-a-side categories above Under 13', () => {
  const pgs = optionsFor('pgs');
  assert.deepEqual(pgs.map((option) => option.officialName), [
    'Under 14', 'Under 15 maschile', 'Under 16', 'Under 17',
    'Under 19', 'Open', 'Masters', 'Don Bosco Cup',
  ]);
  for (const option of pgs) {
    const age = option.officialName.match(/Under (\d+)/)?.[1];
    if (age) assert.ok(Number(age) > 13);
  }
});

test('territorial and historical evidence does not become a national current option', () => {
  assert.ok(optionsFor('csi').some((option) => option.officialName === 'Eccellenza'));
  assert.ok(optionsFor('asc').every((option) => option.optionKind.startsWith('territorial_')));
  assert.ok(optionsFor('us_acli').every((option) => option.optionKind.startsWith('territorial_')));
  const endas = optionsFor('endas');
  assert.equal(endas.length, 1);
  assert.equal(endas[0].targetSeason, null);
  assert.equal(endas[0].selectorEligibleAfterReview, false);
  assert.equal(catalog.options.some((option) => option.officialName.includes('Over 40')), false);
});

test('FIP stays unresolved and cannot expose football options', () => {
  const fip = catalog.organizations.find((organization) => organization.code === 'fip_unresolved');
  assert.ok(fip);
  assert.equal(fip.selectorEligibleAfterReview, false);
  assert.deepEqual(optionsFor('fip_unresolved'), []);
  assert.deepEqual(catalog.legacyMovePlan.notApplicableToFootballUntilResolved, ['FIP']);
});

test('6C bis remains review-only and cannot activate runtime or Production', () => {
  assert.equal(catalog.importAuthorized, false);
  assert.equal(catalog.runtimeAuthorized, false);
  assert.equal(catalog.productionAuthorized, false);
});
