import {
  CanonicalSportsCompatibilityError,
  parseCanonicalSportsWriteIntent,
  planCanonicalSportsWrite,
  type CanonicalCatalogReference,
} from './canonicalSportsCompatibility';
import type {
  SportDisciplineVariantContext,
  SportDisciplineVariantReference,
  SportsTaxonomyRepository,
} from './sportsTaxonomyRepository.server';

export type CanonicalSportWritePayload = {
  canonical?: Partial<SportDisciplineVariantReference> | null;
  legacyValue?: unknown;
  reset?: unknown;
};

export type CanonicalSportWritePlan =
  | { action: 'no_change' }
  | {
      action: 'write';
      source: 'reset' | 'legacy_mapped' | 'legacy_raw' | 'ambiguous' | 'canonical';
      sportId: string | null;
      disciplineId: string | null;
      variantId: string | null;
      legacyValue: string | null;
    };

export interface SportsTaxonomyWritePlannerRepository {
  getContext: SportsTaxonomyRepository['getContext'];
  getStableLegacyProjection: SportsTaxonomyRepository['getStableLegacyProjection'];
  resolve: SportsTaxonomyRepository['resolve'];
}

type WriteReference = CanonicalCatalogReference & {
  context: SportDisciplineVariantContext | null;
};

const ids = (context: SportDisciplineVariantContext | null) => ({
  sportId: context?.sport.id ?? null,
  disciplineId: context?.discipline?.id ?? null,
  variantId: context?.variant?.id ?? null,
});

/** Produces an atomic row plan only; it never persists it. */
export class CanonicalSportWritePlanService {
  constructor(private readonly repository: SportsTaxonomyWritePlannerRepository) {}

  async plan(payload: CanonicalSportWritePayload): Promise<CanonicalSportWritePlan> {
    const hasCanonical = Object.prototype.hasOwnProperty.call(payload, 'canonical');
    const parsed = parseCanonicalSportsWriteIntent({
      ...(hasCanonical ? {
        canonicalId: payload.canonical && typeof payload.canonical.sportId === 'string'
          ? 'canonical-context'
          : payload.canonical,
      } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'legacyValue') ? { legacyValue: payload.legacyValue } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, 'reset') ? { reset: payload.reset } : {}),
    });

    if (parsed.kind === 'absent') return { action: 'no_change' };
    if (parsed.kind === 'reset') {
      return { action: 'write', source: 'reset', ...ids(null), legacyValue: null };
    }

    if (parsed.kind === 'canonical') {
      const reference = payload.canonical as SportDisciplineVariantReference;
      const context = await this.repository.getContext(reference);
      const projection = context ? await this.repository.getStableLegacyProjection(context) : null;
      if (projection?.status === 'ambiguous' || projection?.status === 'overflow') {
        throw new CanonicalSportsCompatibilityError('invalid_reference');
      }
      const target: WriteReference | null = context
        ? { id: context.id, isActive: context.isActive, context }
        : null;
      const planned = planCanonicalSportsWrite(
        { kind: 'canonical', canonicalId: 'canonical-context' },
        {
          findCanonicalById: () => target,
          findLegacyMatches: () => [],
          isCoherentNewReference: (record) => Boolean(record.context),
          projectStableLegacyValue: () => projection?.value ?? null,
        },
      );
      if (planned.action === 'no_change') return planned;
      return {
        action: 'write',
        source: planned.source,
        ...ids(planned.canonical?.context ?? null),
        legacyValue: planned.legacyValue,
      };
    }

    const resolved = await this.repository.resolve({ legacyValue: parsed.legacyValue });
    const mapped: WriteReference | null = resolved.canonical
      ? { id: resolved.canonical.id, isActive: resolved.canonical.isActive, context: resolved.canonical }
      : null;
    const legacyMatches = resolved.status === 'legacy_mapped' && mapped
      ? [{ canonical: mapped, normalizedLegacyValue: resolved.legacyValue ?? parsed.legacyValue }]
      : resolved.status === 'ambiguous'
        ? [
            { canonical: { id: 'ambiguous-1', isActive: false, context: null }, normalizedLegacyValue: parsed.legacyValue },
            { canonical: { id: 'ambiguous-2', isActive: false, context: null }, normalizedLegacyValue: parsed.legacyValue },
          ]
        : [];
    const planned = planCanonicalSportsWrite(
      { kind: 'legacy', legacyValue: parsed.legacyValue },
      {
        findCanonicalById: () => null,
        findLegacyMatches: () => legacyMatches,
        isCoherentNewReference: (record) => Boolean(record.context),
        projectStableLegacyValue: () => null,
      },
    );
    if (planned.action === 'no_change') return planned;
    return {
      action: 'write',
      source: planned.source,
      ...ids(planned.canonical?.context ?? null),
      legacyValue: planned.legacyValue,
    };
  }
}
