import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { preprocessFrance, preprocessPoland, preprocessSlovenia, preprocessSpain, preprocessSwitzerland } from '../../lib/geo/import/preprocess/officialRaw';

const raw = resolve('imports/geo/raw');

test('real FR COG release yields the exact hierarchy and preserves Corsican string codes', () => {
  const result = preprocessFrance(resolve(raw, 'FR'));
  const counts = result.records.reduce<Record<string, number>>((all, row) => ({ ...all, [row.areaType]: (all[row.areaType] ?? 0) + 1 }), {});
  assert.deepEqual(counts, { REGION: 18, DEPARTMENT: 101, COMMUNE: 34875 });
  assert.equal(result.records.length, 34994);
  assert.ok(result.records.every((row) => row.areaType !== 'COMMUNE' || row.metadata?.typecom === 'COM'));
  assert.ok(result.records.some((row) => row.areaType === 'DEPARTMENT' && row.officialCode === '2A'));
  assert.ok(result.records.some((row) => row.areaType === 'DEPARTMENT' && row.officialCode === '2B'));
  const ajaccio = result.records.find((row) => row.officialCode === '2A004');
  assert.equal(ajaccio?.parentOfficialCode, '2A');
  assert.equal(typeof ajaccio?.officialCode, 'string');
});

test('real ES workbook exposes only municipality names and retains code components as strings', () => {
  const result = preprocessSpain(resolve(raw, 'ES/diccionario26.xlsx'));
  assert.deepEqual(result.inspected.sheets, ['dic25']);
  assert.deepEqual(result.inspected.headers?.dic25, ['CODAUTO', 'CPRO', 'CMUN', 'DC', 'NOMBRE']);
  assert.equal(result.records.length, 8132);
  assert.ok(result.records.every((row) => row.areaType === 'MUNICIPALITY' && row.parentAreaType === 'PROVINCE'));
  assert.equal(result.records[0].officialCode, '01051');
  assert.equal(result.records[0].parentOfficialCode, '01');
  assert.equal(typeof result.records[0].metadata?.autonomousCommunityCode, 'string');
  assert.equal(result.blockers.length, 1);
});

test('real CH GeoPackage uses inspected layers and supports municipalities with and without districts', () => {
  const result = preprocessSwitzerland(resolve(raw, 'CH/swissboundaries3d_2026-01_2056_5728.gpkg.zip'));
  assert.deepEqual(Object.keys(result.inspected.layers ?? {}).sort(), ['tlm_bezirksgebiet', 'tlm_hoheitsgebiet', 'tlm_hoheitsgrenze', 'tlm_kantonsgebiet', 'tlm_landesgebiet']);
  assert.equal(result.records.filter((row) => row.areaType === 'CANTON').length, 26);
  assert.equal(result.records.filter((row) => row.areaType === 'DISTRICT').length, 135);
  assert.equal(result.records.filter((row) => row.areaType === 'MUNICIPALITY').length, 2123);
  assert.ok(result.records.some((row) => row.areaType === 'MUNICIPALITY' && row.parentAreaType === 'DISTRICT'));
  assert.ok(result.records.some((row) => row.areaType === 'MUNICIPALITY' && row.parentAreaType === 'CANTON'));
  assert.ok(result.records.every((row) => row.coordinates === undefined && row.bounds === undefined));
});

test('real SI sheet selects statistical regions and municipalities with explicit parents', () => {
  const result = preprocessSlovenia(resolve(raw, 'SI/NUTS3,_SKTE5,7, 2022 - Tabela.xlsx'));
  assert.deepEqual(result.inspected.sheets, ['NUTS3,_SKTE5,7, 2022 - Tabela']);
  assert.equal(result.records.filter((row) => row.areaType === 'STATISTICAL_REGION').length, 12);
  assert.equal(result.records.filter((row) => row.areaType === 'MUNICIPALITY').length, 212);
  assert.ok(result.records.filter((row) => row.areaType === 'MUNICIPALITY').every((row) => row.parentOfficialCode && row.parentAreaType === 'STATISTICAL_REGION'));
});

test('real PL TERC CSV selects voivodeship, powiat and actual gmina rows', () => {
  const result = preprocessPoland(resolve(raw, 'PL/TERC_Urzedowy_2026-08-24.zip'));
  assert.deepEqual(Object.values(result.inspected.headers ?? {})[0], ['WOJ', 'POW', 'GMI', 'RODZ', 'NAZWA', 'NAZWA_DOD', 'STAN_NA']);
  assert.equal(result.records.filter((row) => row.areaType === 'VOIVODESHIP').length, 16);
  assert.equal(result.records.filter((row) => row.areaType === 'POWIAT').length, 380);
  assert.equal(result.records.filter((row) => row.areaType === 'GMINA').length, 2479);
  assert.ok(result.records.filter((row) => row.areaType === 'GMINA').every((row) => row.parentAreaType === 'POWIAT' && typeof row.officialCode === 'string'));
});

test('preprocessors have no network, Supabase, DB writes, migrations, or Italy paths and local data is ignored', () => {
  const source = readFileSync(new URL('../../lib/geo/import/preprocess/officialRaw.ts', import.meta.url), 'utf8')
    + readFileSync(new URL('../../scripts/geo/preprocess-official.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|https?:\/\/|supabase|createClient|\.upsert\(|\.insert\(|\.update\(|\.delete\(|migration|ital(?:y|ia)/i);
  const ignore = readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^imports\/geo\/raw\/$/m);
  assert.match(ignore, /^imports\/geo\/staging\/\*\.json$/m);
});
