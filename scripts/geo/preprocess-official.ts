import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import { preprocessFrance, preprocessPoland, preprocessSlovenia, preprocessSpain, preprocessSwitzerland } from '../../lib/geo/import/preprocess/officialRaw';

const raw = resolve('imports/geo/raw');
const output = resolve('imports/geo/staging');
const countryArgumentIndex = process.argv.indexOf('--country');
const requested = countryArgumentIndex >= 0 ? process.argv[countryArgumentIndex + 1]?.toUpperCase() : undefined;
const jobs = {
  FR: () => preprocessFrance(resolve(raw, 'FR')),
  ES: () => preprocessSpain(resolve(raw, 'ES/diccionario26.xlsx')),
  CH: () => preprocessSwitzerland(resolve(raw, 'CH/swissboundaries3d_2026-01_2056_5728.gpkg.zip')),
  SI: () => preprocessSlovenia(resolve(raw, 'SI/NUTS3,_SKTE5,7, 2022 - Tabela.xlsx')),
  PL: () => preprocessPoland(resolve(raw, 'PL/TERC_Urzedowy_2026-08-24.zip')),
};

async function main() {
  const countries = requested ? [requested] : Object.keys(jobs);
  await mkdir(output, { recursive: true });
  for (const country of countries) {
    const job = jobs[country as keyof typeof jobs];
    if (!job) throw new Error(`Unsupported country: ${country}`);
    const result = job();
    await writeFile(resolve(output, `${country}.staging.json`), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${country}: ${result.records.length} staging records; blockers=${result.blockers.length}\n`);
  }
}

void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
