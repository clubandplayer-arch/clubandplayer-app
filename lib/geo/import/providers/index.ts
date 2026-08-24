import { adaptFranceInseeStaging } from './franceInsee';
import { adaptPolandTerytStaging } from './polandTeryt';
import { adaptSloveniaOfficialStaging } from './sloveniaOfficial';
import { adaptSpainIneStaging } from './spainIne';
import { adaptSwitzerlandBfsStaging } from './switzerlandBfs';
import type { OfficialDatasetContext, OfficialGeoStagingRecord } from './staging';

export const OFFICIAL_GEO_ADAPTERS = {
  FR: adaptFranceInseeStaging,
  ES: adaptSpainIneStaging,
  CH: adaptSwitzerlandBfsStaging,
  SI: adaptSloveniaOfficialStaging,
  PL: adaptPolandTerytStaging,
} satisfies Record<string, (rows: readonly OfficialGeoStagingRecord[], context: OfficialDatasetContext) => unknown>;

export type OfficialGeoCountry = keyof typeof OFFICIAL_GEO_ADAPTERS;
