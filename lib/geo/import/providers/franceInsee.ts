import { adaptOfficialStagingRecords, type OfficialDatasetContext, type OfficialGeoStagingRecord } from './staging';

export const FRANCE_INSEE_PROVIDER = 'fr_insee_cog';
export const FRANCE_INSEE_CODE_AUTHORITY = 'FR_INSEE_COG';

export const adaptFranceInseeStaging = (rows: readonly OfficialGeoStagingRecord[], context: OfficialDatasetContext) =>
  adaptOfficialStagingRecords(rows, context, {
    provider: FRANCE_INSEE_PROVIDER, countryIso2: 'FR', codeAuthority: FRANCE_INSEE_CODE_AUTHORITY,
    namespaces: { REGION: 'region', DEPARTMENT: 'department', COMMUNE: 'commune' },
    levels: { REGION: 1, DEPARTMENT: 2, COMMUNE: 3 },
    allowedParents: { REGION: [], DEPARTMENT: ['REGION'], COMMUNE: ['DEPARTMENT'] },
  });
