import { adaptOfficialStagingRecords, type OfficialDatasetContext, type OfficialGeoStagingRecord } from './staging';

export const SWITZERLAND_BFS_PROVIDER = 'ch_bfs';
export const SWITZERLAND_BFS_CODE_AUTHORITY = 'CH_BFS';

export const adaptSwitzerlandBfsStaging = (rows: readonly OfficialGeoStagingRecord[], context: OfficialDatasetContext) =>
  adaptOfficialStagingRecords(rows, context, {
    provider: SWITZERLAND_BFS_PROVIDER, countryIso2: 'CH', codeAuthority: SWITZERLAND_BFS_CODE_AUTHORITY,
    namespaces: { CANTON: 'canton', DISTRICT: 'district', MUNICIPALITY: 'municipality' },
    levels: { CANTON: 1, DISTRICT: 2, MUNICIPALITY: 3 },
    allowedParents: { CANTON: [], DISTRICT: ['CANTON'], MUNICIPALITY: ['CANTON', 'DISTRICT'] },
    resolveLevel: (row) => row.areaType.toUpperCase() === 'MUNICIPALITY' && row.parentAreaType?.toUpperCase() === 'CANTON' ? 2 : ({ CANTON: 1, DISTRICT: 2, MUNICIPALITY: 3 }[row.areaType.toUpperCase()] ?? 0),
  });
