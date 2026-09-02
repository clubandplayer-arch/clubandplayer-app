import {
  CANONICAL_COUNTRIES,
  CANONICAL_SPORT_DISCIPLINES,
  CANONICAL_SPORT_VARIANTS,
  CANONICAL_SPORTS,
  type CanonicalCountry,
  type CanonicalSport,
  type CanonicalSportDiscipline,
  type CanonicalSportVariant,
} from '@/lib/taxonomy/catalog';

export type CountryResolution = {
  status: 'canonical' | 'legacy' | 'unknown' | 'empty';
  legacyValue: string | null;
  country: CanonicalCountry | null;
};

export type SportResolution = {
  status: 'canonical' | 'legacy' | 'unknown' | 'empty';
  legacyValue: string | null;
  legacyLabel: string | null;
  sport: CanonicalSport | null;
  discipline: CanonicalSportDiscipline | null;
  variant: CanonicalSportVariant | null;
};

type SportMapping = {
  sportCode: string;
  disciplineCode?: string;
  variantCode?: string;
  legacyLabel: string;
};

export function normalizeLegacyTaxonomyValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const countryByCode = new Map<string, CanonicalCountry>(
  CANONICAL_COUNTRIES.map((country) => [country.iso2, country]),
);
const sportByCode = new Map<string, CanonicalSport>(CANONICAL_SPORTS.map((sport) => [sport.code, sport]));
const disciplineByCode = new Map<string, CanonicalSportDiscipline>(
  CANONICAL_SPORT_DISCIPLINES.map((discipline) => [discipline.code, discipline]),
);
const variantByCode = new Map<string, CanonicalSportVariant>(
  CANONICAL_SPORT_VARIANTS.map((variant) => [variant.code, variant]),
);

const COUNTRY_LEGACY_MAPPINGS = new Map<string, string>([
  ['it', 'IT'],
  ['ita', 'IT'],
  ['italia', 'IT'],
  ['italy', 'IT'],
  ['fr', 'FR'],
  ['fra', 'FR'],
  ['francia', 'FR'],
  ['france', 'FR'],
  ['es', 'ES'],
  ['esp', 'ES'],
  ['spagna', 'ES'],
  ['spain', 'ES'],
  ['ch', 'CH'],
  ['che', 'CH'],
  ['svizzera', 'CH'],
  ['switzerland', 'CH'],
  ['si', 'SI'],
  ['svn', 'SI'],
  ['slovenia', 'SI'],
  ['pl', 'PL'],
  ['pol', 'PL'],
  ['polonia', 'PL'],
  ['poland', 'PL'],
  ['pt', 'PT'],
  ['prt', 'PT'],
  ['portogallo', 'PT'],
  ['portugal', 'PT'],
  ['de', 'DE'],
  ['deu', 'DE'],
  ['germania', 'DE'],
  ['germany', 'DE'],
  ['at', 'AT'],
  ['aut', 'AT'],
  ['austria', 'AT'],
]);

const SPORT_LEGACY_MAPPINGS = new Map<string, SportMapping>();

function addSportMapping(values: readonly string[], mapping: SportMapping) {
  for (const value of values) {
    SPORT_LEGACY_MAPPINGS.set(normalizeLegacyTaxonomyValue(value), mapping);
  }
}

addSportMapping(['Calcio', 'calcio'], {
  sportCode: 'football',
  disciplineCode: 'association_football',
  variantCode: 'eleven_a_side',
  legacyLabel: 'Calcio',
});
addSportMapping(['Calcio a 8', 'calcio_a_8'], {
  sportCode: 'football',
  disciplineCode: 'association_football',
  variantCode: 'eight_a_side',
  legacyLabel: 'Calcio a 8',
});
addSportMapping(['Futsal'], {
  sportCode: 'football',
  disciplineCode: 'futsal',
  legacyLabel: 'Futsal',
});
addSportMapping(['Volley', 'Pallavolo', 'pallavolo'], { sportCode: 'volleyball', legacyLabel: 'Volley' });
addSportMapping(['Basket', 'basket'], { sportCode: 'basketball', legacyLabel: 'Basket' });
addSportMapping(['Pallanuoto', 'pallanuoto'], { sportCode: 'water_polo', legacyLabel: 'Pallanuoto' });
addSportMapping(['Pallamano', 'pallamano'], { sportCode: 'handball', legacyLabel: 'Pallamano' });
addSportMapping(['Rugby', 'rugby'], { sportCode: 'rugby', legacyLabel: 'Rugby' });
addSportMapping(['Hockey su prato', 'hockey_prato'], { sportCode: 'field_hockey', legacyLabel: 'Hockey su prato' });
addSportMapping(['Hockey su ghiaccio', 'hockey_ghiaccio'], {
  sportCode: 'ice_hockey',
  legacyLabel: 'Hockey su ghiaccio',
});
addSportMapping(['Baseball', 'baseball'], { sportCode: 'baseball', legacyLabel: 'Baseball' });
addSportMapping(['Softball', 'softball'], { sportCode: 'softball', legacyLabel: 'Softball' });
addSportMapping(['Lacrosse', 'lacrosse'], { sportCode: 'lacrosse', legacyLabel: 'Lacrosse' });
addSportMapping(['Football americano', 'football_americano'], {
  sportCode: 'american_football',
  legacyLabel: 'Football americano',
});
addSportMapping(['Cricket', 'cricket'], { sportCode: 'cricket', legacyLabel: 'Cricket' });

export function resolveCountryTaxonomy(value?: string | null): CountryResolution {
  const legacyValue = value?.trim() || null;
  if (!legacyValue) return { status: 'empty', legacyValue, country: null };

  const canonicalCode = legacyValue.toUpperCase();
  const canonical = countryByCode.get(canonicalCode);
  if (canonical) return { status: 'canonical', legacyValue, country: canonical };

  const mappedCode = COUNTRY_LEGACY_MAPPINGS.get(normalizeLegacyTaxonomyValue(legacyValue));
  const mapped = mappedCode ? countryByCode.get(mappedCode) ?? null : null;
  return mapped
    ? { status: 'legacy', legacyValue, country: mapped }
    : { status: 'unknown', legacyValue, country: null };
}

export function resolveSportTaxonomy(value?: string | null): SportResolution {
  const legacyValue = value?.trim() || null;
  if (!legacyValue) {
    return { status: 'empty', legacyValue, legacyLabel: null, sport: null, discipline: null, variant: null };
  }

  const normalized = normalizeLegacyTaxonomyValue(legacyValue);
  const canonicalSport = sportByCode.get(normalized);
  const mapping = SPORT_LEGACY_MAPPINGS.get(normalized);

  if (!mapping && canonicalSport) {
    return {
      status: 'canonical',
      legacyValue,
      legacyLabel: legacyValue,
      sport: canonicalSport,
      discipline: null,
      variant: null,
    };
  }

  if (!mapping) {
    return {
      status: 'unknown',
      legacyValue,
      legacyLabel: legacyValue,
      sport: null,
      discipline: null,
      variant: null,
    };
  }

  return {
    status: canonicalSport && normalized === canonicalSport.code ? 'canonical' : 'legacy',
    legacyValue,
    legacyLabel: mapping.legacyLabel,
    sport: sportByCode.get(mapping.sportCode) ?? null,
    discipline: mapping.disciplineCode ? disciplineByCode.get(mapping.disciplineCode) ?? null : null,
    variant: mapping.variantCode ? variantByCode.get(mapping.variantCode) ?? null : null,
  };
}

export function getLegacySportLabel(value?: string | null): string | null {
  return resolveSportTaxonomy(value).legacyLabel;
}
