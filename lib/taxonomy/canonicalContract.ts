/**
 * Phase 5B domain contract. This module is intentionally pure and is not wired
 * to database, API or UI paths. Schema and persistence belong to later phases.
 */

export const TAXONOMY_CONTRACT_VERSION = '5b-v1' as const;

export const CANONICAL_ENTITY_KINDS = [
  'sport',
  'discipline',
  'variant',
  'sports_organization',
  'competition',
  'competition_level',
  'competition_group',
  'age_class',
  'gender_class',
  'season',
  'competition_format',
  'player_role',
  'staff_role',
] as const;

export type CanonicalEntityKind = (typeof CANONICAL_ENTITY_KINDS)[number];

export type CanonicalReference = {
  /** Database identity. It is never inferred from a localized label. */
  id: string;
  /** Stable, non-localized wire identifier within the entity namespace. */
  code: string;
};

export type CompatibilityValue = {
  canonical: CanonicalReference | null;
  /** Canonical target resolved from an explicit legacy mapping, never a label guess. */
  mappedLegacy: CanonicalReference | null;
  /** Exact persisted legacy value; never a translated presentation label. */
  legacyValue: string | null;
};

export type CompatibilityReadSource = 'canonical' | 'mapped_legacy' | 'raw_legacy' | 'empty';

export function selectCompatibilityReadSource(value: CompatibilityValue): CompatibilityReadSource {
  if (value.canonical) return 'canonical';
  if (value.mappedLegacy) return 'mapped_legacy';
  if (!value.legacyValue?.trim()) return 'empty';
  return 'raw_legacy';
}

export const CANONICAL_READ_PRECEDENCE = [
  'canonical',
  'mapped_legacy',
  'raw_legacy',
  'empty',
] as const satisfies readonly CompatibilityReadSource[];

export const LEGACY_API_FIELDS_FROZEN_FOR_MOBILE = {
  profiles: ['sport', 'role', 'gender', 'club_league_category'],
  athlete_experiences: ['sport', 'role', 'category', 'club_name', 'start_year', 'end_year', 'is_current'],
  opportunities: [
    'sport',
    'role',
    'role_group',
    'category',
    'required_category',
    'gender',
    'age_min',
    'age_max',
  ],
} as const;

export const COMPATIBILITY_RULES = {
  additionsAreNullable: true,
  canonicalIdsAreDatabaseReferences: true,
  codesAreStableWireKeys: true,
  labelsArePresentationOnly: true,
  unknownLegacyValuesRemainReadable: true,
  noAutomaticUserDataBackfill: true,
  absentFieldMeansNoChange: true,
  explicitNullMeansClearCanonicalOnly: true,
  legacyFieldsRemainAcceptedAndReturned: true,
  mobileParityIsSeparate: true,
} as const;

export const RELATION_RULES = {
  disciplineRequiresSport: true,
  variantRequiresDiscipline: true,
  playerRoleRequiresSportCompatibility: true,
  staffRoleIsCrossSportByDefault: true,
  competitionRequiresOrganization: true,
  competitionIdentityIsNotItsLabel: true,
  seasonUsesDateBoundariesNotLabelIdentity: true,
  competitionGroupRequiresCompetitionAndSeason: true,
  ageClassIsNotCompetitionLevel: true,
  territorialScopeIsCountryAware: true,
  profileSupportsOrderedMultiSportWithOptionalPrimary: true,
} as const;

export type CanonicalTuple = {
  sportId: string | null;
  disciplineId: string | null;
  variantId: string | null;
};

export function validateCanonicalTuple(tuple: CanonicalTuple): string[] {
  const errors: string[] = [];
  if (tuple.disciplineId && !tuple.sportId) errors.push('discipline_requires_sport');
  if (tuple.variantId && !tuple.disciplineId) errors.push('variant_requires_discipline');
  return errors;
}
