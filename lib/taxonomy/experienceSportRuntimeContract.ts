import type { CanonicalSportWritePlanService } from './canonicalSportWritePlanService.server';
import {
  planProfilePrimarySportRequest,
  type ProfilePrimarySportColumns,
} from './profilePrimarySportRuntimeContract';

export type ExperienceSportInput = Record<string, unknown> & {
  sport?: unknown;
  primarySport?: unknown;
};

/** Plans one experience sport using the same legacy/additive contract as Profile. */
export async function planExperienceSportRequest(
  input: ExperienceSportInput,
  planner: Pick<CanonicalSportWritePlanService, 'plan'>,
): Promise<ProfilePrimarySportColumns> {
  const planned = await planProfilePrimarySportRequest(input, planner);
  if (!planned || !planned.sport) {
    throw new Error('experience_sport_required');
  }
  return planned;
}

export function projectExperiencePrimarySport(row: {
  sport_id?: string | null;
  sport_discipline_id?: string | null;
  sport_variant_id?: string | null;
}) {
  if (!row.sport_id) return null;
  return {
    sportId: row.sport_id,
    disciplineId: row.sport_discipline_id ?? null,
    variantId: row.sport_variant_id ?? null,
  };
}
