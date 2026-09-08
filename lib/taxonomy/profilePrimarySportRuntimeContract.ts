import {
  CanonicalSportsCompatibilityError,
} from './canonicalSportsCompatibility';
import type { CanonicalSportWritePlan } from './canonicalSportWritePlanService.server';

export const PROFILE_PRIMARY_SPORT_COLUMNS = [
  'sport',
  'sport_id',
  'sport_discipline_id',
  'sport_variant_id',
] as const;

export type ProfilePrimarySportColumns = {
  sport: string | null;
  sport_id: string | null;
  sport_discipline_id: string | null;
  sport_variant_id: string | null;
};

export type ProfilePrimarySportContractError = {
  status: 400 | 500;
  code:
    | CanonicalSportsCompatibilityError['code']
    | 'profile_primary_sport_write_failed';
};

/**
 * Converts a validated 5E-D plan to one future profiles-row mutation payload.
 * Returning null means the caller must not issue a write.
 */
export function projectProfilePrimarySportColumns(
  plan: CanonicalSportWritePlan,
): ProfilePrimarySportColumns | null {
  if (plan.action === 'no_change') return null;
  return {
    sport: plan.legacyValue,
    sport_id: plan.sportId,
    sport_discipline_id: plan.disciplineId,
    sport_variant_id: plan.variantId,
  };
}

/** Stable future API mapping; unexpected repository/database errors are not exposed. */
export function mapProfilePrimarySportContractError(
  error: unknown,
): ProfilePrimarySportContractError {
  if (error instanceof CanonicalSportsCompatibilityError) {
    return { status: 400, code: error.code };
  }
  return { status: 500, code: 'profile_primary_sport_write_failed' };
}
