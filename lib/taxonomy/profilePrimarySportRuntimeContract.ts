import {
  CanonicalSportsCompatibilityError,
} from './canonicalSportsCompatibility';
import type {
  CanonicalSportWritePayload,
  CanonicalSportWritePlan,
  CanonicalSportWritePlanService,
} from './canonicalSportWritePlanService.server';

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

const owns = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

/** Converts the additive API shape, or the legacy `sport` alias, into one planner call. */
export async function planProfilePrimarySportRequest(
  body: Record<string, unknown>,
  planner: Pick<CanonicalSportWritePlanService, 'plan'>,
): Promise<ProfilePrimarySportColumns | null> {
  const hasPrimarySport = owns(body, 'primarySport');
  const hasLegacySport = owns(body, 'sport');
  if (hasPrimarySport && hasLegacySport) {
    throw new CanonicalSportsCompatibilityError('conflicting_input');
  }

  let payload: CanonicalSportWritePayload = {};
  if (hasPrimarySport) {
    const value = body.primarySport;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new CanonicalSportsCompatibilityError('invalid_input');
    }
    const keys = Object.keys(value);
    if (!keys.length || keys.some((key) => !['canonical', 'legacyValue', 'reset'].includes(key))) {
      throw new CanonicalSportsCompatibilityError('invalid_input');
    }
    payload = value as CanonicalSportWritePayload;
  } else if (hasLegacySport) {
    const value = body.sport;
    payload = value === null || (typeof value === 'string' && value.trim() === '')
      ? { reset: true }
      : { legacyValue: value };
  }

  return projectProfilePrimarySportColumns(await planner.plan(payload));
}

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
