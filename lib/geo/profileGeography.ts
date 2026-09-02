export type ProfileGeoArea = {
  id: string;
  countryId: string;
  countryIso2: string;
  parentId: string | null;
  officialName: string;
  areaType: string;
  level: number;
};

export type LegacyProfileGeography = {
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  interestCountry?: string | null;
  interestRegion?: string | null;
  interestProvince?: string | null;
  interestCity?: string | null;
  interestRegionId?: string | number | null;
  interestProvinceId?: string | number | null;
  interestMunicipalityId?: string | number | null;
  residenceRegionId?: string | number | null;
  residenceProvinceId?: string | number | null;
  residenceMunicipalityId?: string | number | null;
};

export type ItalyLegacyMapping = {
  entityType: 'region' | 'province' | 'municipality';
  legacyId: string;
  area: ProfileGeoArea;
  ancestors: ProfileGeoArea[];
};

export type ProfileGeographySnapshot = {
  residenceCountryId: string | null;
  residenceCountryIso2: string | null;
  residenceGeoAreaId: string | null;
  residenceArea: ProfileGeoArea | null;
  residenceAncestors: ProfileGeoArea[];
  openToRelocation: boolean;
  countryInterests: Array<{ countryId: string; iso2: string; priority: number | null }>;
  geoAreaInterests: Array<{ area: ProfileGeoArea; priority: number | null }>;
  legacy: LegacyProfileGeography;
  italyLegacyMappings: ItalyLegacyMapping[];
};

export type ResidenceGeographyResolution = {
  source: 'canonical' | 'italy_legacy_mapping' | 'legacy_text' | 'none';
  countryId: string | null;
  countryIso2: string | null;
  areaId: string | null;
  area: ProfileGeoArea | null;
  ancestors: ProfileGeoArea[];
  legacyText: Pick<LegacyProfileGeography, 'country' | 'region' | 'province' | 'city' | 'interestCountry' | 'interestRegion' | 'interestProvince' | 'interestCity'>;
};

const legacyText = (legacy: LegacyProfileGeography): ResidenceGeographyResolution['legacyText'] => ({
  country: legacy.country ?? null,
  region: legacy.region ?? null,
  province: legacy.province ?? null,
  city: legacy.city ?? null,
  interestCountry: legacy.interestCountry ?? null,
  interestRegion: legacy.interestRegion ?? null,
  interestProvince: legacy.interestProvince ?? null,
  interestCity: legacy.interestCity ?? null,
});

const hasLegacyText = (legacy: ResidenceGeographyResolution['legacyText']) =>
  Object.values(legacy).some((value) => typeof value === 'string' && value.trim().length > 0);

export function resolveProfileResidenceGeography(snapshot: ProfileGeographySnapshot): ResidenceGeographyResolution {
  const preservedLegacy = legacyText(snapshot.legacy);
  if (snapshot.residenceGeoAreaId) {
    return { source: 'canonical', countryId: snapshot.residenceCountryId, countryIso2: snapshot.residenceCountryIso2, areaId: snapshot.residenceGeoAreaId, area: snapshot.residenceArea, ancestors: snapshot.residenceAncestors, legacyText: preservedLegacy };
  }

  const candidates: Array<['municipality' | 'province' | 'region', string | number | null | undefined]> = [
    ['municipality', snapshot.legacy.residenceMunicipalityId],
    ['province', snapshot.legacy.residenceProvinceId],
    ['region', snapshot.legacy.residenceRegionId],
  ];
  for (const [entityType, id] of candidates) {
    if (id == null || String(id).trim() === '') continue;
    const mapping = snapshot.italyLegacyMappings.find((item) => item.entityType === entityType && item.legacyId === String(id));
    if (mapping) return { source: 'italy_legacy_mapping', countryId: mapping.area.countryId, countryIso2: 'IT', areaId: mapping.area.id, area: mapping.area, ancestors: mapping.ancestors, legacyText: preservedLegacy };
  }

  return { source: hasLegacyText(preservedLegacy) ? 'legacy_text' : 'none', countryId: snapshot.residenceCountryId, countryIso2: snapshot.residenceCountryIso2, areaId: null, area: null, ancestors: [], legacyText: preservedLegacy };
}

export type ProfileGeographyRepository = { load(profileId: string): Promise<ProfileGeographySnapshot> };
export async function getProfileGeography(repository: ProfileGeographyRepository, profileId: string) {
  const snapshot = await repository.load(profileId);
  return {
    residence: resolveProfileResidenceGeography(snapshot),
    residenceCountry: { id: snapshot.residenceCountryId, iso2: snapshot.residenceCountryIso2 },
    countryInterests: snapshot.countryInterests,
    geoAreaInterests: snapshot.geoAreaInterests,
    openToRelocation: snapshot.openToRelocation,
  };
}

export type ProfileGeographyWriteInput = {
  residenceCountryId?: string | null;
  residenceGeoAreaId?: string | null;
  openToRelocation?: boolean;
  legacy?: LegacyProfileGeography;
  countryInterests?: Array<{ countryId: string; priority?: number | null }>;
  geoAreaInterests?: Array<{ geoAreaId: string; priority?: number | null }>;
};

/** Builds compatible persistence payloads only; callers remain responsible for executing writes. */
export function buildProfileGeographyDualWrite(profileId: string, input: ProfileGeographyWriteInput) {
  const preferences = {
    profile_id: profileId,
    ...(input.residenceCountryId !== undefined ? { residence_country_id: input.residenceCountryId } : {}),
    ...(input.residenceGeoAreaId !== undefined ? { residence_geo_area_id: input.residenceGeoAreaId } : {}),
    ...(input.openToRelocation !== undefined ? { open_to_relocation: input.openToRelocation } : {}),
  };
  const legacyProfile = input.legacy ? {
    country: input.legacy.country ?? null,
    region: input.legacy.region ?? null,
    province: input.legacy.province ?? null,
    city: input.legacy.city ?? null,
    interest_country: input.legacy.interestCountry ?? null,
    interest_region: input.legacy.interestRegion ?? null,
    interest_province: input.legacy.interestProvince ?? null,
    interest_city: input.legacy.interestCity ?? null,
    interest_region_id: input.legacy.interestRegionId ?? null,
    interest_province_id: input.legacy.interestProvinceId ?? null,
    interest_municipality_id: input.legacy.interestMunicipalityId ?? null,
  } : null;
  return {
    preferences,
    legacyProfile,
    countryInterests: (input.countryInterests ?? []).map((item) => ({ profile_id: profileId, country_id: item.countryId, priority: item.priority ?? null })),
    geoAreaInterests: (input.geoAreaInterests ?? []).map((item) => ({ profile_id: profileId, geo_area_id: item.geoAreaId, priority: item.priority ?? null })),
  };
}
