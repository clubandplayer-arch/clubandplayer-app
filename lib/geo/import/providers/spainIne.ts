import { adaptOfficialStagingRecords, type OfficialDatasetContext, type OfficialGeoStagingRecord } from './staging';

export const SPAIN_INE_PROVIDER = 'es_ine';
export const SPAIN_INE_CODE_AUTHORITY = 'ES_INE';

export const adaptSpainIneStaging = (rows: readonly OfficialGeoStagingRecord[], context: OfficialDatasetContext) =>
  adaptOfficialStagingRecords(rows, context, {
    provider: SPAIN_INE_PROVIDER, countryIso2: 'ES', codeAuthority: SPAIN_INE_CODE_AUTHORITY,
    namespaces: { AUTONOMOUS_COMMUNITY: 'autonomous-community', PROVINCE: 'province', MUNICIPALITY: 'municipality' },
    levels: { AUTONOMOUS_COMMUNITY: 1, PROVINCE: 2, MUNICIPALITY: 3 },
    allowedParents: { AUTONOMOUS_COMMUNITY: [], PROVINCE: ['AUTONOMOUS_COMMUNITY'], MUNICIPALITY: ['PROVINCE'] },
  });
