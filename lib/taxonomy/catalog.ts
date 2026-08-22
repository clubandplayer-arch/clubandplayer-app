export type CanonicalCountry = {
  iso2: string;
  iso3: string;
  officialName: string;
  isSupported: boolean;
  isActive: boolean;
  displayOrder: number;
};

export type CanonicalSport = {
  code: string;
  canonicalName: string;
  isActive: boolean;
  displayOrder: number;
};

export type CanonicalSportDiscipline = {
  sportCode: string;
  code: string;
  canonicalName: string;
  isIndependentlySelectable: boolean;
  isActive: boolean;
  displayOrder: number;
};

export type CanonicalSportVariant = {
  disciplineCode: string;
  code: string;
  canonicalName: string;
  teamSize: number | null;
  isActive: boolean;
  displayOrder: number;
};

export const CANONICAL_COUNTRIES = [
  { iso2: 'IT', iso3: 'ITA', officialName: 'Italy', isSupported: true, isActive: true, displayOrder: 10 },
  { iso2: 'FR', iso3: 'FRA', officialName: 'France', isSupported: true, isActive: true, displayOrder: 20 },
  { iso2: 'ES', iso3: 'ESP', officialName: 'Spain', isSupported: true, isActive: true, displayOrder: 30 },
  { iso2: 'CH', iso3: 'CHE', officialName: 'Switzerland', isSupported: true, isActive: true, displayOrder: 40 },
  { iso2: 'SI', iso3: 'SVN', officialName: 'Slovenia', isSupported: true, isActive: true, displayOrder: 50 },
  { iso2: 'PL', iso3: 'POL', officialName: 'Poland', isSupported: true, isActive: true, displayOrder: 60 },
  { iso2: 'PT', iso3: 'PRT', officialName: 'Portugal', isSupported: false, isActive: false, displayOrder: 70 },
  { iso2: 'DE', iso3: 'DEU', officialName: 'Germany', isSupported: false, isActive: false, displayOrder: 80 },
  { iso2: 'AT', iso3: 'AUT', officialName: 'Austria', isSupported: false, isActive: false, displayOrder: 90 },
  { iso2: 'AL', iso3: 'ALB', officialName: 'Albania', isSupported: false, isActive: false, displayOrder: 100 },
  { iso2: 'AR', iso3: 'ARG', officialName: 'Argentina', isSupported: false, isActive: false, displayOrder: 110 },
  { iso2: 'BJ', iso3: 'BEN', officialName: 'Benin', isSupported: false, isActive: false, displayOrder: 120 },
  { iso2: 'BR', iso3: 'BRA', officialName: 'Brazil', isSupported: false, isActive: false, displayOrder: 130 },
  { iso2: 'DO', iso3: 'DOM', officialName: 'Dominican Republic', isSupported: false, isActive: false, displayOrder: 140 },
  { iso2: 'GH', iso3: 'GHA', officialName: 'Ghana', isSupported: false, isActive: false, displayOrder: 150 },
  { iso2: 'GQ', iso3: 'GNQ', officialName: 'Equatorial Guinea', isSupported: false, isActive: false, displayOrder: 160 },
  { iso2: 'PY', iso3: 'PRY', officialName: 'Paraguay', isSupported: false, isActive: false, displayOrder: 170 },
  { iso2: 'RU', iso3: 'RUS', officialName: 'Russian Federation', isSupported: false, isActive: false, displayOrder: 180 },
  { iso2: 'SN', iso3: 'SEN', officialName: 'Senegal', isSupported: false, isActive: false, displayOrder: 190 },
  { iso2: 'UA', iso3: 'UKR', officialName: 'Ukraine', isSupported: false, isActive: false, displayOrder: 200 },
] as const satisfies readonly CanonicalCountry[];

export const CANONICAL_SPORTS = [
  { code: 'football', canonicalName: 'Football', isActive: true, displayOrder: 10 },
  { code: 'volleyball', canonicalName: 'Volleyball', isActive: true, displayOrder: 20 },
  { code: 'basketball', canonicalName: 'Basketball', isActive: true, displayOrder: 30 },
  { code: 'water_polo', canonicalName: 'Water Polo', isActive: true, displayOrder: 40 },
  { code: 'handball', canonicalName: 'Handball', isActive: true, displayOrder: 50 },
  { code: 'rugby', canonicalName: 'Rugby', isActive: true, displayOrder: 60 },
  { code: 'field_hockey', canonicalName: 'Field Hockey', isActive: true, displayOrder: 70 },
  { code: 'ice_hockey', canonicalName: 'Ice Hockey', isActive: true, displayOrder: 80 },
  { code: 'baseball', canonicalName: 'Baseball', isActive: true, displayOrder: 90 },
  { code: 'softball', canonicalName: 'Softball', isActive: true, displayOrder: 100 },
  { code: 'lacrosse', canonicalName: 'Lacrosse', isActive: true, displayOrder: 110 },
  { code: 'american_football', canonicalName: 'American Football', isActive: true, displayOrder: 120 },
  { code: 'cricket', canonicalName: 'Cricket', isActive: false, displayOrder: 900 },
] as const satisfies readonly CanonicalSport[];

// Disciplines are only introduced where they add current domain meaning. Other
// sports map directly to their canonical sport instead of receiving a fake
// "default" discipline.
export const CANONICAL_SPORT_DISCIPLINES = [
  {
    sportCode: 'football',
    code: 'association_football',
    canonicalName: 'Association Football',
    isIndependentlySelectable: true,
    isActive: true,
    displayOrder: 10,
  },
  {
    sportCode: 'football',
    code: 'futsal',
    canonicalName: 'Futsal',
    isIndependentlySelectable: true,
    isActive: true,
    displayOrder: 20,
  },
] as const satisfies readonly CanonicalSportDiscipline[];

export const CANONICAL_SPORT_VARIANTS = [
  {
    disciplineCode: 'association_football',
    code: 'eleven_a_side',
    canonicalName: '11-a-side',
    teamSize: 11,
    isActive: true,
    displayOrder: 10,
  },
  {
    disciplineCode: 'association_football',
    code: 'eight_a_side',
    canonicalName: '8-a-side',
    teamSize: 8,
    isActive: true,
    displayOrder: 20,
  },
] as const satisfies readonly CanonicalSportVariant[];
