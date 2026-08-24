import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import type { GeoCountExpectation } from '../pipeline';
import type { OfficialGeoStagingRecord } from '../providers/staging';

export type OfficialRawResult = {
  country: 'FR' | 'ES' | 'CH' | 'SI' | 'PL';
  provider: string;
  codeAuthority: string;
  datasetVersion: string;
  datasetPublishedAt?: string;
  sourceUrlIdentifier: string;
  inspected: { files: string[]; sheets?: string[]; layers?: Record<string, string[]>; headers?: Record<string, string[]> };
  records: OfficialGeoStagingRecord[];
  expected?: Record<string, GeoCountExpectation>;
  blockers: string[];
  licenseStatus: 'CONFIRM_REQUIRED';
};

type Sheet = { name: string; rows: string[][] };

const xmlText = (value: string) => value
  .replace(/<[^>]*>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const unzipText = (file: string, member: string) => execFileSync('unzip', ['-p', file, member], {
  encoding: 'utf8', maxBuffer: 100 * 1024 * 1024,
});

const columnIndex = (ref: string) => {
  let result = 0;
  for (const char of ref.match(/^[A-Z]+/)?.[0] ?? '') result = result * 26 + char.charCodeAt(0) - 64;
  return result - 1;
};

export function readFirstXlsxSheet(file: string): Sheet {
  const workbook = unzipText(file, 'xl/workbook.xml');
  const name = xmlText(workbook.match(/<sheet\b[^>]*\bname="([^"]+)"/)?.[1] ?? 'Sheet1');
  const sharedXml = (() => { try { return unzipText(file, 'xl/sharedStrings.xml'); } catch { return ''; } })();
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)]
    .map((match) => xmlText([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join('')));
  const sheetXml = unzipText(file, 'xl/worksheets/sheet1.xml');
  const rows = [...sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const values: string[] = [];
    for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = cell[1].match(/\br="([A-Z]+\d+)"/)?.[1] ?? '';
      const type = cell[1].match(/\bt="([^"]+)"/)?.[1];
      const raw = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1]
        ?? [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join('');
      values[columnIndex(ref)] = type === 's' ? (shared[Number(raw)] ?? '') : xmlText(raw);
    }
    return values.map((value) => value ?? '');
  });
  return { name, rows };
}

const parseCsv = (text: string, delimiter = ',') => {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
};

const objects = (rows: string[][], headerIndex = 0) => rows.slice(headerIndex + 1).map((values) =>
  Object.fromEntries(rows[headerIndex].map((header, index) => [header, values[index] ?? ''])));

export function preprocessFrance(root: string): OfficialRawResult {
  const files = ['v_region_2026.csv', 'v_departement_2026.csv', 'v_commune_2026.csv'];
  const load = (file: string) => parseCsv(readFileSync(join(root, file), 'utf8'));
  const [regions, departments, communes] = files.map(load);
  const records: OfficialGeoStagingRecord[] = [
    ...objects(regions).map((row) => ({ countryIso2: 'FR', areaType: 'REGION', officialCode: row.REG, officialName: row.LIBELLE, sourceUpdatedAt: '2026-02-24' })),
    ...objects(departments).map((row) => ({ countryIso2: 'FR', areaType: 'DEPARTMENT', officialCode: row.DEP, officialName: row.LIBELLE, parentAreaType: 'REGION', parentOfficialCode: row.REG, sourceUpdatedAt: '2026-02-24' })),
    ...objects(communes).filter((row) => row.TYPECOM === 'COM').map((row) => ({ countryIso2: 'FR', areaType: 'COMMUNE', officialCode: row.COM, officialName: row.LIBELLE, parentAreaType: 'DEPARTMENT', parentOfficialCode: row.DEP, sourceUpdatedAt: '2026-02-24', metadata: { typecom: row.TYPECOM } })),
  ];
  return { country: 'FR', provider: 'fr_insee_cog', codeAuthority: 'FR_INSEE_COG', datasetVersion: 'COG-2026', datasetPublishedAt: '2026-02-24', sourceUrlIdentifier: 'INSEE-COG-2026-local-release', inspected: { files, headers: Object.fromEntries(files.map((file, index) => [file, [regions, departments, communes][index][0]])) }, records, expected: { REGION: { min: 18, max: 18 }, DEPARTMENT: { min: 101, max: 101 }, COMMUNE: { min: 34875, max: 34875 } }, blockers: [], licenseStatus: 'CONFIRM_REQUIRED' };
}

export function preprocessSpain(file: string): OfficialRawResult {
  const sheet = readFirstXlsxSheet(file); const headers = sheet.rows[1];
  const records = objects(sheet.rows, 1).map((row) => ({ countryIso2: 'ES', areaType: 'MUNICIPALITY', officialCode: `${row.CPRO}${row.CMUN}`, officialName: row.NOMBRE, parentAreaType: 'PROVINCE', parentOfficialCode: row.CPRO, metadata: { autonomousCommunityCode: row.CODAUTO, checkDigit: row.DC } }));
  return { country: 'ES', provider: 'es_ine', codeAuthority: 'ES_INE', datasetVersion: '2026-01-01', sourceUrlIdentifier: 'INE-diccionario26-local-release', inspected: { files: [basename(file)], sheets: [sheet.name], headers: { [sheet.name]: headers } }, records, expected: { MUNICIPALITY: { min: 8132, max: 8132 } }, blockers: ['The workbook has codes but no official names for autonomous communities or provinces; those parent records cannot be constructed without a complementary official source.'], licenseStatus: 'CONFIRM_REQUIRED' };
}

const sqliteJson = <T>(file: string, sql: string) => JSON.parse(execFileSync('sqlite3', ['-json', file, sql], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }) || '[]') as T[];

export function preprocessSwitzerland(zip: string): OfficialRawResult {
  const temp = mkdtempSync(join(tmpdir(), 'geo-ch-'));
  try {
    execFileSync('unzip', ['-q', zip, '-d', temp]);
    const gpkgName = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n')[0];
    const gpkg = join(temp, gpkgName);
    const layers = sqliteJson<{ table_name: string }>(gpkg, "select table_name from gpkg_contents where data_type='features' order by table_name");
    const layerFields = Object.fromEntries(layers.map(({ table_name }) => [table_name, sqliteJson<{ name: string }>(gpkg, `pragma table_info('${table_name}')`).map(({ name }) => name)]));
    const cantons = sqliteJson<{ code: string; name: string }>(gpkg, "select cast(kantonsnummer as text) code,name from tlm_kantonsgebiet where icc='CH'");
    const districts = sqliteJson<{ code: string; canton: string; name: string }>(gpkg, "select cast(bezirksnummer as text) code,cast(kantonsnummer as text) canton,name from tlm_bezirksgebiet where icc='CH'");
    const municipalities = sqliteJson<{ code: string; district: string | null; canton: string; name: string }>(gpkg, "select cast(bfs_nummer as text) code,cast(bezirksnummer as text) district,cast(kantonsnummer as text) canton,name from tlm_hoheitsgebiet where icc='CH'");
    const districtCodes = new Set(districts.map(({ code }) => code));
    const records: OfficialGeoStagingRecord[] = [
      ...cantons.map((row) => ({ countryIso2: 'CH', areaType: 'CANTON', officialCode: row.code, officialName: row.name })),
      ...districts.map((row) => ({ countryIso2: 'CH', areaType: 'DISTRICT', officialCode: row.code, officialName: row.name, parentAreaType: 'CANTON', parentOfficialCode: row.canton })),
      ...municipalities.map((row) => ({ countryIso2: 'CH', areaType: 'MUNICIPALITY', officialCode: row.code, officialName: row.name, parentAreaType: row.district && districtCodes.has(row.district) ? 'DISTRICT' : 'CANTON', parentOfficialCode: row.district && districtCodes.has(row.district) ? row.district : row.canton })),
    ];
    return { country: 'CH', provider: 'ch_bfs', codeAuthority: 'CH_BFS', datasetVersion: 'swissBOUNDARIES3D-2026-01', sourceUrlIdentifier: 'swissBOUNDARIES3D_1_5_LV95_LN02', inspected: { files: [basename(zip), gpkgName], layers: layerFields }, records, blockers: [], licenseStatus: 'CONFIRM_REQUIRED' };
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

export function preprocessSlovenia(file: string): OfficialRawResult {
  const sheet = readFirstXlsxSheet(file); const headers = sheet.rows[0]; const rows = objects(sheet.rows);
  const records = rows.filter((row) => row.Raven === '1' || row.Raven === '2').map((row) => row.Raven === '1'
    ? { countryIso2: 'SI', areaType: 'STATISTICAL_REGION', officialCode: row['Šifra kategorije'], officialName: row.Desktriptor }
    : { countryIso2: 'SI', areaType: 'MUNICIPALITY', officialCode: row['Šifra kategorije'], officialName: row.Desktriptor, parentAreaType: 'STATISTICAL_REGION', parentOfficialCode: row['Šifra starša'] });
  return { country: 'SI', provider: 'si_gurs_surs', codeAuthority: 'SI_GURS', datasetVersion: '2022', sourceUrlIdentifier: 'NUTS3-SKTE5-7-2022-local-release', inspected: { files: [basename(file)], sheets: [sheet.name], headers: { [sheet.name]: headers } }, records, blockers: [], licenseStatus: 'CONFIRM_REQUIRED' };
}

export function preprocessPoland(zip: string): OfficialRawResult {
  const csvName = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n').find((name) => name.endsWith('.csv'));
  if (!csvName) throw new Error('TERYT archive has no CSV file');
  const parsed = parseCsv(unzipText(zip, csvName), ';'); const rows = objects(parsed);
  const records: OfficialGeoStagingRecord[] = rows.flatMap((row) => {
    if (!row.POW) return [{ countryIso2: 'PL', areaType: 'VOIVODESHIP', officialCode: row.WOJ, officialName: row.NAZWA, sourceUpdatedAt: row.STAN_NA }];
    if (!row.GMI) return [{ countryIso2: 'PL', areaType: 'POWIAT', officialCode: `${row.WOJ}${row.POW}`, officialName: row.NAZWA, parentAreaType: 'VOIVODESHIP', parentOfficialCode: row.WOJ, sourceUpdatedAt: row.STAN_NA }];
    if (['1', '2', '3'].includes(row.RODZ)) return [{ countryIso2: 'PL', areaType: 'GMINA', officialCode: `${row.WOJ}${row.POW}${row.GMI}${row.RODZ}`, officialName: row.NAZWA, parentAreaType: 'POWIAT', parentOfficialCode: `${row.WOJ}${row.POW}`, sourceUpdatedAt: row.STAN_NA, metadata: { rodz: row.RODZ, nameQualifier: row.NAZWA_DOD } }];
    return [];
  });
  return { country: 'PL', provider: 'pl_gus_teryt', codeAuthority: 'PL_TERYT', datasetVersion: 'TERC-2026-08-24', sourceUrlIdentifier: 'TERC_Urzedowy_2026-08-24', inspected: { files: [basename(zip), csvName], headers: { [csvName]: parsed[0] } }, records, blockers: [], licenseStatus: 'CONFIRM_REQUIRED' };
}
