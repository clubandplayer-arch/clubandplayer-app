import { adaptOfficialStagingRecords, type OfficialDatasetContext, type OfficialGeoStagingRecord } from './staging';

export const POLAND_TERYT_PROVIDER = 'pl_gus_teryt';
export const POLAND_TERYT_CODE_AUTHORITY = 'PL_TERYT';

export const adaptPolandTerytStaging = (rows: readonly OfficialGeoStagingRecord[], context: OfficialDatasetContext) =>
  adaptOfficialStagingRecords(rows, context, {
    provider: POLAND_TERYT_PROVIDER, countryIso2: 'PL', codeAuthority: POLAND_TERYT_CODE_AUTHORITY,
    namespaces: { VOIVODESHIP: 'voivodeship', POWIAT: 'powiat', GMINA: 'gmina' },
    levels: { VOIVODESHIP: 1, POWIAT: 2, GMINA: 3 },
    allowedParents: { VOIVODESHIP: [], POWIAT: ['VOIVODESHIP'], GMINA: ['POWIAT'] },
  });
