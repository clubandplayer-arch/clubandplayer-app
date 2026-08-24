import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { adaptCountryStateCityLocalExport, type CountryStateCityLocalRecord } from '../../lib/geo/import/countryStateCity';
import { createGeoImportDryRun } from '../../lib/geo/import/pipeline';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const file = argument('file');
  const country = argument('country');
  const provider = argument('provider');
  const sourceLicense = argument('license');
  if (!file || !country || !provider || !sourceLicense) {
    throw new Error('Usage: pnpm geo:import:csc --file <local.json> --country <ISO2> --provider <name> --license <identifier> --dry-run');
  }
  if (!process.argv.includes('--dry-run')) {
    throw new Error('This adapter defaults to safety: use --dry-run. Database execution must use an explicitly configured GeoImportRepository.');
  }

  const rows = JSON.parse(await readFile(file, 'utf8')) as CountryStateCityLocalRecord[];
  const records = adaptCountryStateCityLocalExport(rows, { provider, sourceLicense });
  const report = createGeoImportDryRun(records, country);
  process.stdout.write(`${JSON.stringify({ ...report, records: undefined }, null, 2)}\n`);
  if (report.invalidRecords) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
