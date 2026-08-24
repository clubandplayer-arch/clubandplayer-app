import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { getSupabaseAdminClient } from '../../lib/supabase/admin';
import { prepareEuropeanProductionImport, ProductionImportFailure } from '../../lib/geo/import/productionImport';
import { EUROPEAN_PRODUCTION_IMPORTS } from '../../lib/geo/import/productionConfig';
import { OFFICIAL_GEO_ADAPTERS, type OfficialGeoCountry } from '../../lib/geo/import/providers';
import type { OfficialGeoStagingRecord } from '../../lib/geo/import/providers/staging';
import { SupabaseProductionGeoRepository } from '../../lib/geo/import/supabaseProductionRepository';

const argument = (name: string) => { const index = process.argv.indexOf(`--${name}`); return index < 0 ? undefined : process.argv[index + 1]; };

async function main() {
  const country = argument('country')?.toUpperCase() as OfficialGeoCountry | undefined;
  const file = argument('file'); const apply = process.argv.includes('--apply'); const checkExisting = process.argv.includes('--check-existing');
  if (process.argv.includes('--dry-run') && apply) throw new Error('Choose either --dry-run or --apply');
  if (!country || !file || !EUROPEAN_PRODUCTION_IMPORTS[country]) throw new Error('Usage: pnpm geo:import --country <FR|ES|CH|SI|PL> --file <staging.json> [--dry-run [--check-existing] | --apply]');
  const payload = JSON.parse(await readFile(file, 'utf8')) as { records: OfficialGeoStagingRecord[] };
  const config = EUROPEAN_PRODUCTION_IMPORTS[country];
  const adapted = OFFICIAL_GEO_ADAPTERS[country](payload.records, { sourceLicense: config.sourceLicense, datasetVersion: config.datasetVersion, datasetPublishedAt: config.datasetPublishedAt, sourceUrlIdentifier: config.sourceUrlIdentifier })
    .map((record) => ({ ...record, metadata: { ...record.metadata, attribution: config.attribution, ...config.metadata } }));
  const repository = apply || checkExisting ? new SupabaseProductionGeoRepository(getSupabaseAdminClient()) : null;
  const report = await prepareEuropeanProductionImport(repository, country, adapted, { apply });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
void main().catch((error: unknown) => {
  if (error instanceof ProductionImportFailure) process.stderr.write(`${JSON.stringify(error.report, null, 2)}\n`);
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1;
});
