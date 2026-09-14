import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { changeClubCategory, changeClubCountry, changeClubOrganization, changeClubSport, clubAffiliationPatch, hydrateClubAffiliation } from '../../lib/taxonomy/clubAffiliation';
import { isOrganizationActiveOn, parseClubAffiliation, validateClubAffiliation } from '../../lib/taxonomy/clubAffiliation.server';

const migration = readFileSync('supabase/migrations/20261213120000_club_primary_organization_affiliation.sql','utf8');
const component = readFileSync('components/profiles/ClubAffiliationCascade.tsx','utf8');
const api = readFileSync('app/api/profiles/me/route.ts','utf8');

test('migration adds nullable canonical club affiliation with an atomic category/organization FK',()=>{
  for (const column of ['club_country_id','club_primary_organization_id','club_organization_category_id']) assert.match(migration,new RegExp(`add column ${column} uuid`));
  assert.match(migration,/foreign key \(club_organization_category_id, club_primary_organization_id, club_country_id\)/);
  assert.match(migration,/references public\.sports_organization_categories\(id, organization_id, country_id\)/);
  assert.match(migration,/validate_club_primary_affiliation/);
  assert.match(migration,/new\.account_type is distinct from 'club'/);
  assert.match(migration,/set search_path = pg_catalog, public/);
  assert.match(migration,/revoke execute on function public\.validate_club_primary_affiliation/);
});

test('LND materialization is exact, stable, eleven-a-side and contains no seasonal model',()=>{
  assert.match(migration,/v\.code='eleven_a_side'/);
  for (const name of ['Serie D','Eccellenza','Promozione','Prima Categoria','Seconda Categoria','Terza Categoria']) assert.match(migration,new RegExp(`'${name}'`));
  for (const forbidden of ['competition_editions','season_id','territorial_scope','level_rank']) assert.doesNotMatch(migration,new RegExp(forbidden,'i'));
  assert.match(migration,/matches > 1 then raise exception/);
  assert.match(migration,/incorrect LND category identity/);
});

test('Club cascade uses GET catalogs, no-store and clears dependent IDs',()=>{
  assert.match(component,/\/api\/geo\/countries/);
  assert.match(component,/\/api\/taxonomy\/sports-organizations/);
  assert.match(component,/\/api\/taxonomy\/competitive-options/);
  assert.ok((component.match(/cache:'no-store'/g)??[]).length>=3);
  assert.match(component,/changeClubSport/);
  assert.match(component,/changeClubOrganization/);
  assert.doesNotMatch(component,/service_role|\.insert\(|\.update\(|\.delete\(/);
});

test('profile API validates and writes affiliation atomically while omission preserves legacy rows',()=>{
  assert.match(api,/hasOwnProperty\.call\(body, 'clubAffiliation'\)/);
  assert.match(api,/effectiveAccountType !== 'club'/);
  assert.match(api,/validateClubAffiliation/);
  assert.match(api,/updates\.club_league_category = result\.categoryName/);
  assert.doesNotMatch(api,/clubAffiliation[^]*required_category/);
});

test('pure cascade transitions reset only dependent canonical selections and ignore locale',()=>{
  const initial={countryId:'it',sport:{sportId:'football',disciplineId:'association',variantId:'eleven',legacySport:'Calcio'},organizationId:'lnd',categoryId:'serie-d'};
  assert.deepEqual(changeClubCountry(initial,'fr'),{countryId:'fr',sport:{sportId:'',disciplineId:'',variantId:'',legacySport:''},organizationId:'',categoryId:''});
  assert.equal(changeClubSport(initial,{...initial.sport,variantId:'eight',legacySport:'Calcio a 8'}).organizationId,'');
  assert.equal(changeClubOrganization(initial,'c8').categoryId,'');
  assert.equal(changeClubCategory(initial,'serie-a').categoryId,'serie-a');
});

test('server contract rejects partial and mismatched scope and accepts exact active identity',async()=>{
  assert.equal(parseClubAffiliation({countryId:'x',organizationId:null,categoryId:null}),null);
  const ids=['461318f5-f19e-4565-8c0f-680660f78c80','219a9b21-1a63-5d16-a477-3e1fe51368ca','d0f2c15e-925f-522b-84a4-aedd51fa61e3'];
  const input=parseClubAffiliation({countryId:ids[0],organizationId:ids[1],categoryId:ids[2]})!;
  const source={category:async()=>({id:ids[2],organization_id:ids[1],country_id:ids[0],sport_id:'sport',discipline_id:'discipline',variant_id:'variant',canonical_name:'Serie A',is_active:true}),organization:async()=>({id:ids[1],is_active:true,valid_from:null,valid_to:null}),countryIso2:async()=> 'IT'};
  assert.equal(await validateClubAffiliation(source,input,{sportId:'wrong',disciplineId:'discipline',variantId:'variant'}),null);
  assert.deepEqual(await validateClubAffiliation(source,input,{sportId:'sport',disciplineId:'discipline',variantId:'variant'}),{clear:false,countryId:ids[0],organizationId:ids[1],categoryId:ids[2],countryIso2:'IT',categoryName:'Serie A'});
});

test('organization validity is enforced on the save date without assuming primary country',async()=>{
  assert.equal(isOrganizationActiveOn({id:'org',is_active:true,valid_from:'2026-01-01',valid_to:'2026-12-31'},'2026-09-14'),true);
  assert.equal(isOrganizationActiveOn({id:'org',is_active:true,valid_from:null,valid_to:'2026-09-13'},'2026-09-14'),false);
  assert.equal(isOrganizationActiveOn({id:'org',is_active:true,valid_from:'2026-09-15',valid_to:null},'2026-09-14'),false);
  assert.match(api,/select\('id,is_active,valid_from,valid_to'\)\.eq\('id',id\)/);
  assert.doesNotMatch(api,/organization\(id\)[^}]*primary_country_id/);
  assert.match(migration,/o\.valid_from is null or o\.valid_from <= current_date/);
  assert.match(migration,/o\.valid_to is null or o\.valid_to >= current_date/);
});

test('official catalog names are rendered verbatim and locale does not enter catalog URLs',()=>{
  assert.match(component,/>\{o\.officialName\}<\/option>/);
  assert.match(component,/>\{c\.officialName\}<\/option>/);
  assert.doesNotMatch(component,/URLSearchParams\([^)]*locale/);
});

test('country lookup invalidates stale requests immediately and synchronizes canonical country',()=>{
  assert.match(component,/setCountryId\(''\); setCountryState\('loading'\); setOrganizations\(\[\]\); setCategories\(\[\]\)/);
  assert.match(component,/current\.countryId !== nextId/);
  assert.match(component,/onChangeRef\.current\(changeClubCountry\(current,nextId\)\)/);
});

test('profile hydration reloads canonical IDs while clean legacy profiles omit the new payload',()=>{
  const hydrated=hydrateClubAffiliation({club_country_id:'country',club_primary_organization_id:'org',club_organization_category_id:'category',club_league_category:'Serie D',sport_id:'sport',sport_discipline_id:'discipline',sport_variant_id:'variant'},'Calcio');
  assert.deepEqual(hydrated,{countryId:'country',organizationId:'org',categoryId:'category',categoryName:'Serie D',sport:{sportId:'sport',disciplineId:'discipline',variantId:'variant',legacySport:'Calcio'}});
  assert.deepEqual(clubAffiliationPatch(hydrated,false),{});
  assert.deepEqual(clubAffiliationPatch(hydrated,true),{clubAffiliation:{countryId:'country',organizationId:'org',categoryId:'category'}});
  assert.deepEqual(clubAffiliationPatch({...hydrated,categoryId:''},true),{clubAffiliation:{countryId:null,organizationId:null,categoryId:null}});
});
