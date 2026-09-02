import { normalizeGeoImportRecord, type CanonicalGeoAreaImportRecord } from '../canonical';

export type CountryStateCityLocalRecord = {
  id: string | number;
  name: string;
  country_code: string;
  parent_id?: string | number | null;
  area_type: string;
  level: number;
  code?: string | null;
  code_authority?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  source_updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type CountryStateCityAdapterOptions = {
  provider: string;
  sourceLicense: string;
};

export function adaptCountryStateCityLocalExport(
  rows: readonly CountryStateCityLocalRecord[],
  options: CountryStateCityAdapterOptions,
): CanonicalGeoAreaImportRecord[] {
  if (!options.provider.trim()) throw new Error('source_provider is required');
  if (!options.sourceLicense.trim()) throw new Error('source_license is required');

  return rows.map((row) => normalizeGeoImportRecord({
    provider: options.provider,
    externalId: String(row.id),
    countryIso2: row.country_code,
    parentExternalId: row.parent_id == null ? null : String(row.parent_id),
    code: row.code,
    codeAuthority: row.code_authority,
    officialName: row.name,
    areaType: row.area_type,
    level: row.level,
    coordinates: row.latitude == null && row.longitude == null
      ? null
      : { lat: row.latitude, lng: row.longitude },
    metadata: row.metadata,
    sourceUpdatedAt: row.source_updated_at,
    sourceLicense: options.sourceLicense,
  }));
}
