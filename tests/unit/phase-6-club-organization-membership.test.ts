import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20261213120000_lnd_club_organization_membership.sql', 'utf8');
const catalogMigration = readFileSync('supabase/migrations/20261214120000_sports_organization_catalog_order.sql', 'utf8');

test('LND is seeded once as a league with exactly the authorized categories', () => {
  assert.match(migration, /'lega_nazionale_dilettanti', 'Lega Nazionale Dilettanti', 'league'/);
  for (const name of ['Serie D','Eccellenza','Promozione','Prima Categoria','Seconda Categoria','Terza Categoria']) {
    assert.equal((migration.match(new RegExp(`'${name}'`, 'g')) ?? []).length, 1);
  }
  assert.doesNotMatch(migration, /insert[\s\S]*lega_calcio_a_8/i);
});

test('organization catalog has the authorized order, official evidence and no unverified links', () => {
  const orderedCodes = [
    'lega_nazionale_dilettanti', 'lega_calcio_a_8', 'eifa', 'csi', 'uisp',
    'csen', 'aics', 'opes', 'asc', 'endas', 'pgs', 'us_acli',
  ];
  assert.match(catalogMigration, new RegExp(`array\\[${orderedCodes.map((code) => `'${code}'`).join(',')}\\]::text\\[\\]`));
  assert.match(catalogMigration, /'consultedOn', '2026-09-14'/);
  assert.match(catalogMigration, /'evidenceUse', 'official_organization_identity_only'/);
  assert.match(catalogMigration, /'eifa_serie_a_delite', 'Serie A d''Elite'/);
  for (const code of ['csi', 'uisp', 'csen', 'aics', 'opes', 'asc', 'endas', 'pgs', 'us_acli']) {
    assert.doesNotMatch(catalogMigration, new RegExp(`${code}:category:`));
  }
});

test('organization labels use LND and the requested public acronyms', () => {
  const display = readFileSync('lib/sports/organizationDisplay.ts', 'utf8');
  const labels = ['LND', 'Lega Calcio a 8', 'E.I.F.A.', 'CSI', 'UISP', 'CSEN', 'AICS', 'OPES', 'ASC', 'ENDAS', 'PGS', 'US ACLI'];
  let previous = -1;
  for (const label of labels) {
    const position = display.indexOf(`'${label}'`);
    assert.ok(position > previous, `${label} must occur in the requested order`);
    previous = position;
  }
  const endpoint = readFileSync('app/api/sports/organization-memberships/route.ts', 'utf8');
  assert.match(endpoint, /display_name: sportsOrganizationDisplayName/);
  const publicPage = readFileSync('app/(dashboard)/clubs/[id]/page.tsx', 'utf8');
  assert.match(publicPage, /sportsOrganizationDisplayName\(organization\.code, organization\.canonical_name\)/);
});

test('membership references stay nullable for legacy rows and are validated atomically', () => {
  assert.match(migration, /add column sports_organization_id uuid references/);
  assert.match(migration, /add column sports_organization_category_id uuid references/);
  assert.match(migration, /sports_organization_and_category_required_together/);
  assert.match(migration, /c\.sport_id=new\.sport_id/);
  assert.match(migration, /c\.discipline_id is not distinct from new\.sport_discipline_id/);
  assert.match(migration, /c\.variant_id is not distinct from new\.sport_variant_id/);
  assert.match(migration, /before insert or update[\s\S]*on public\.profiles/);
  assert.match(migration, /before insert or update[\s\S]*on public\.opportunities/);
});

test('the shared UI implements the dependent organization/category selectors', () => {
  const component = readFileSync('components/sports/OrganizationCategoryFields.tsx', 'utf8');
  assert.match(component, /c\.sport_id===sport\.sportId/);
  assert.match(component, /c\.organization_id===value\.organizationId/);
  assert.match(component, /onChange\(\{ organizationId:e\.target\.value, categoryId:'' \}, ''\)/);
  assert.match(component, /disabled=\{!value\.organizationId\}/);
  assert.match(component, /required=\{Boolean\(value\.organizationId\)\}/);
  assert.match(component, /selected\?\.canonical_name \?\? ''/);
});

test('profile and opportunity writes carry both canonical references', () => {
  for (const path of ['components/profiles/ProfileEditForm.tsx','components/opportunities/OpportunityForm.tsx']) {
    const source=readFileSync(path,'utf8');
    assert.match(source,/sports_organization_id/);
    assert.match(source,/sports_organization_category_id/);
  }
});

test('catalog hydration preserves legacy membership fields until a genuine user sport change', () => {
  const selector=readFileSync('components/sports/CanonicalSportFilter.tsx','utf8');
  assert.match(selector, /onChange\(hydrated, \{ source: 'hydration' \}\)/);
  assert.match(selector, /\}, \{ source: 'user' \}\)/);
  for (const path of ['components/profiles/ProfileEditForm.tsx','components/opportunities/OpportunityForm.tsx']) {
    const source=readFileSync(path,'utf8');
    assert.match(source,/meta\.source === 'user'/);
  }
  const profile=readFileSync('components/profiles/ProfileEditForm.tsx','utf8');
  assert.match(profile,/setClubCategory\(p\.club_league_category \|\| ''\)/);
});

test('route handlers validate the final exact membership scope before writing', () => {
  const helper=readFileSync('lib/sports/organizationMembership.server.ts','utf8');
  assert.match(helper,/eq\('organization_id',scope\.organizationId\)/);
  assert.match(helper,/eq\('sport_id',scope\.sportId\)/);
  assert.match(helper,/\.is\('discipline_id',null\)/);
  assert.match(helper,/\.is\('variant_id',null\)/);
  assert.match(helper,/from\('sports_organizations'\)[\s\S]*eq\('is_active',true\)/);
  for (const path of ['app/api/profiles/me/route.ts','app/api/opportunities/route.ts','app/api/opportunities/[id]/route.ts']) {
    const source=readFileSync(path,'utf8');
    assert.match(source,/await validateOrganizationMembership\(supabase/);
    assert.match(source,/OrganizationMembershipError/);
  }
});
