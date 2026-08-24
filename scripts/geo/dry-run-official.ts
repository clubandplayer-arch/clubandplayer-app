import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { createGeoImportDryRun, type GeoCountExpectation } from '../../lib/geo/import/pipeline';
import { OFFICIAL_GEO_ADAPTERS, type OfficialGeoCountry } from '../../lib/geo/import/providers';
import type { OfficialGeoStagingRecord } from '../../lib/geo/import/providers/staging';

const argument = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
};

async function main() {
  const country = argument('country')?.toUpperCase() as OfficialGeoCountry | undefined;
  const file = argument('file');
  const sourceLicense = argument('license');
  const datasetVersion = argument('dataset-version');
  if (!country || !file || !sourceLicense || !datasetVersion || !OFFICIAL_GEO_ADAPTERS[country]) {
    throw new Error('Usage: pnpm geo:dry-run --country <FR|ES|CH|SI|PL> --file <staging.json> --license <id> --dataset-version <version>');
  }
  const payload = JSON.parse(await readFile(file, 'utf8')) as {
    records: OfficialGeoStagingRecord[];
    datasetPublishedAt?: string;
    sourceUrlIdentifier?: string;
    expected?: Record<string, GeoCountExpectation>;
  };
  const records = OFFICIAL_GEO_ADAPTERS[country](payload.records, {
    sourceLicense, datasetVersion,
    datasetPublishedAt: payload.datasetPublishedAt,
    sourceUrlIdentifier: payload.sourceUrlIdentifier,
  });
  const report = createGeoImportDryRun(records, country, [], { datasetVersion, expected: payload.expected });
  process.stdout.write(`${JSON.stringify({ ...report, records: undefined }, null, 2)}\n`);
  if (report.invalidRecords || report.errors.length) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
