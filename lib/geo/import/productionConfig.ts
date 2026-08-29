import type { GeoCountExpectation } from './pipeline';
import type { OfficialGeoCountry } from './providers';

export type EuropeanProductionProvenance = {
  country: OfficialGeoCountry;
  provider: string;
  codeAuthority: string;
  datasetVersion: string;
  datasetPublishedAt: string | null;
  sourceLicense: string;
  attribution: string;
  sourceUrlIdentifier: string;
  metadata: Record<string, string>;
  expected: Record<string, Required<GeoCountExpectation>>;
  total: number;
};

export const EUROPEAN_PRODUCTION_IMPORTS: Readonly<Record<OfficialGeoCountry, EuropeanProductionProvenance>> = {
  FR: { country: 'FR', provider: 'fr_insee_cog', codeAuthority: 'FR_INSEE_COG', datasetVersion: 'COG-2026', datasetPublishedAt: '2026-02-24', sourceLicense: 'ETALAB_OPEN_LICENSE_2_0', attribution: 'Source: Insee', sourceUrlIdentifier: 'INSEE-COG-2026', metadata: {}, expected: { REGION: { min: 18, max: 18 }, DEPARTMENT: { min: 101, max: 101 }, COMMUNE: { min: 34875, max: 34875 } }, total: 34994 },
  ES: { country: 'ES', provider: 'es_ine', codeAuthority: 'ES_INE', datasetVersion: '2026-01-01', datasetPublishedAt: null, sourceLicense: 'CC-BY-4.0', attribution: 'Source: Instituto Nacional de Estadística (INE)', sourceUrlIdentifier: 'INE-MUNICIPALITIES-2026', metadata: {}, expected: { AUTONOMOUS_COMMUNITY: { min: 19, max: 19 }, PROVINCE: { min: 52, max: 52 }, MUNICIPALITY: { min: 8132, max: 8132 } }, total: 8203 },
  CH: { country: 'CH', provider: 'ch_bfs', codeAuthority: 'CH_BFS', datasetVersion: 'swissBOUNDARIES3D-2026-01', datasetPublishedAt: '2025-12-18', sourceLicense: 'SWISSTOPO_OGD_TERMS', attribution: '© swisstopo', sourceUrlIdentifier: 'swissBOUNDARIES3D_1_5_LV95_LN02', metadata: { dataState: '2026-01-01' }, expected: { CANTON: { min: 26, max: 26 }, DISTRICT: { min: 135, max: 135 }, MUNICIPALITY: { min: 2123, max: 2123 } }, total: 2284 },
  SI: { country: 'SI', provider: 'si_gurs_surs', codeAuthority: 'SI_GURS', datasetVersion: '2022', datasetPublishedAt: null, sourceLicense: 'SURS_FREE_USE_WITH_ATTRIBUTION', attribution: 'Source: SURS', sourceUrlIdentifier: 'NUTS3-SKTE5-7-2022', metadata: { validFrom: '2022-11-17', derivativeAttribution: 'Source: SURS; processed by Club and Player' }, expected: { STATISTICAL_REGION: { min: 12, max: 12 }, MUNICIPALITY: { min: 212, max: 212 } }, total: 224 },
  PL: { country: 'PL', provider: 'pl_gus_teryt', codeAuthority: 'PL_TERYT', datasetVersion: 'TERC-2026-08-24', datasetPublishedAt: null, sourceLicense: 'GUS_PUBLIC_SECTOR_REUSE_TERMS', attribution: 'Source: GUS; include production/acquisition time and indicate processing when applicable', sourceUrlIdentifier: 'TERC_Urzedowy_2026-08-24', metadata: { attributionRequirement: 'source + production/acquisition time + indication of processing when applicable' }, expected: { VOIVODESHIP: { min: 16, max: 16 }, POWIAT: { min: 380, max: 380 }, GMINA: { min: 2479, max: 2479 } }, total: 2875 },
};
