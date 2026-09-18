export const CLUB_NAME_ACRONYMS_BY_COUNTRY = {
  // UC was already recognised by the Italian name checks and is retained for compatibility.
  IT: ['FC', 'ASD', 'SSD', 'US', 'SS', 'AS', 'GS', 'AC', 'SC', 'CS', 'POL', 'USD', 'UC'],
  FR: ['FC', 'AS', 'US', 'ES', 'CS', 'RC', 'AC', 'SC', 'JS', 'CA', 'CO', 'OC', 'SO', 'ASC', 'AFC'],
  ES: ['CF', 'FC', 'CD', 'UD', 'AD', 'SD', 'RC', 'RCD', 'CA', 'CP', 'EF', 'CDE', 'FS', 'CFS', 'FSF', 'CE', 'UE', 'AE'],
  CH: ['FC', 'SC', 'SV', 'FV', 'AC', 'AS', 'US', 'CS', 'ES', 'BSC', 'CB'],
  SI: ['NK', 'ND', 'NŠ', 'NS', 'ŠD', 'SD', 'ŽNK', 'ZNK', 'MNK', 'KMN', 'FK', 'FC'],
  PL: ['KS', 'LKS', 'ŁKS', 'MKS', 'GKS', 'KP', 'MKP', 'KKS', 'RKS', 'ZKS', 'WKS', 'CWKS', 'UKS', 'LZS', 'GLKS', 'MLKS', 'BKS', 'AKS', 'TS', 'TKS', 'MUKS'],
} as const;

export type ClubNameSignalCountry = keyof typeof CLUB_NAME_ACRONYMS_BY_COUNTRY;

/** Full organization words are signals too, but are deliberately distinct from country acronyms. */
export const CLUB_ORGANIZATION_WORDS = [
  'academy',
  'accademia',
  'associazione',
  'atletico',
  'athletic',
  'basket',
  'calcio',
  'club',
  'polisportiva',
  'real',
  'rugby',
  'societa',
  'società',
  'sport',
  'sporting',
  'team',
  'tennis',
  'unione',
  'united',
  'volley',
] as const;

/** Normalizes case, optional dots and the explicitly supported non-diacritic variants. */
export function normalizeClubNameAcronym(value: string): string {
  return value
    .trim()
    .replace(/\./gu, '')
    .toLocaleUpperCase('und')
    .replaceAll('Ł', 'L')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const NORMALIZED_ACRONYMS = Object.fromEntries(
  Object.entries(CLUB_NAME_ACRONYMS_BY_COUNTRY).map(([country, acronyms]) => [
    country,
    new Set(acronyms.map(normalizeClubNameAcronym)),
  ]),
) as unknown as Record<ClubNameSignalCountry, ReadonlySet<string>>;

function normalizeCountry(value: unknown): ClubNameSignalCountry | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(CLUB_NAME_ACRONYMS_BY_COUNTRY, code)
    ? code as ClubNameSignalCountry
    : null;
}

/**
 * Finds a country-scoped acronym as a complete Unicode letter token. Dots may
 * separate (or trail) its letters; substrings such as `AS` in `Casa` never match.
 */
export function hasRecognizedClubNameAcronym(name: unknown, countryIso2: unknown): boolean {
  if (typeof name !== 'string') return false;
  const country = normalizeCountry(countryIso2);
  if (!country) return false;

  const tokens = name.match(/\p{L}(?:\.?\p{L})*\.?/gu) ?? [];
  return tokens.some((token) => NORMALIZED_ACRONYMS[country].has(normalizeClubNameAcronym(token)));
}

export function hasClubOrganizationWord(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const words = new Set(CLUB_ORGANIZATION_WORDS);
  const tokens = name.match(/\p{L}+/gu) ?? [];
  return tokens.some((token) => words.has(
    token.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('und') as typeof CLUB_ORGANIZATION_WORDS[number],
  ));
}
