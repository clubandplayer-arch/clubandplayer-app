import { adaptOfficialStagingRecords, type OfficialDatasetContext, type OfficialGeoStagingRecord } from './staging';

export const SLOVENIA_OFFICIAL_PROVIDER = 'si_gurs_surs';
export const SLOVENIA_OFFICIAL_CODE_AUTHORITY = 'SI_GURS';

export const adaptSloveniaOfficialStaging = (rows: readonly OfficialGeoStagingRecord[], context: OfficialDatasetContext) =>
  adaptOfficialStagingRecords(rows, context, {
    provider: SLOVENIA_OFFICIAL_PROVIDER, countryIso2: 'SI', codeAuthority: SLOVENIA_OFFICIAL_CODE_AUTHORITY,
    namespaces: { STATISTICAL_REGION: 'statistical-region', MUNICIPALITY: 'municipality' },
    levels: { STATISTICAL_REGION: 1, MUNICIPALITY: 2 },
    allowedParents: { STATISTICAL_REGION: [], MUNICIPALITY: ['STATISTICAL_REGION'] },
  });
