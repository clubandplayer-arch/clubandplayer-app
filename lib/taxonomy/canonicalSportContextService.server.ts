import type { CanonicalSportsResolutionStatus } from './canonicalSportsCompatibility';
import type {
  ResolveSportsTaxonomyInput,
  SportDisciplineVariantContext,
  SportsTaxonomyRepository,
} from './sportsTaxonomyRepository.server';

export type CanonicalSportContext = {
  resolution: CanonicalSportsResolutionStatus;
  sportId: string | null;
  disciplineId: string | null;
  variantId: string | null;
  playerPositionId: string | null;
  staffRoleId: string | null;
};

export interface SportsTaxonomyResolver {
  resolve: SportsTaxonomyRepository['resolve'];
}

const resolvedIds = (canonical: SportDisciplineVariantContext | null) => ({
  sportId: canonical?.sport.id ?? null,
  disciplineId: canonical?.discipline?.id ?? null,
  variantId: canonical?.variant?.id ?? null,
});

/** Internal read-only service. No route, persistence, or UI dependency is created here. */
export class CanonicalSportContextService {
  constructor(private readonly repository: SportsTaxonomyResolver) {}

  async resolve(input: ResolveSportsTaxonomyInput): Promise<CanonicalSportContext> {
    const resolution = await this.repository.resolve(input);
    const canonical = resolution.status === 'canonical' || resolution.status === 'legacy_mapped'
      ? resolution.canonical
      : null;

    return {
      resolution: resolution.status,
      ...resolvedIds(canonical),
      playerPositionId: null,
      staffRoleId: null,
    };
  }
}
