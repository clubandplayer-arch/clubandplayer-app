export type CanonicalSportsResolutionStatus =
  | 'canonical'
  | 'legacy_mapped'
  | 'legacy_raw'
  | 'ambiguous'
  | 'empty'
  | 'invalid_reference';

export type CanonicalCatalogReference = {
  id: string;
  isActive: boolean;
};

export type LegacyCatalogMatch<TCanonical extends CanonicalCatalogReference> = {
  canonical: TCanonical;
  normalizedLegacyValue: string;
};

export type CanonicalSportsReadInput = {
  /** `undefined` means the canonical key was absent; `null` means explicitly empty. */
  canonicalId?: string | null;
  legacyValue?: string | null;
};

export type CanonicalSportsReadResolution<TCanonical extends CanonicalCatalogReference> = {
  status: CanonicalSportsResolutionStatus;
  canonical: TCanonical | null;
  legacyValue: string | null;
  /** Safe display fallback only; it never changes `status`. */
  displayFallback: string | null;
};

export type CanonicalSportsReadAdapter<TCanonical extends CanonicalCatalogReference> = {
  findCanonicalById: (id: string) => TCanonical | null;
  findLegacyMatches: (legacyValue: string) => readonly LegacyCatalogMatch<TCanonical>[];
  /** Validates the complete scoped chain, not only the referenced row. */
  isCoherentHistoricalReference: (canonical: TCanonical) => boolean;
};

const clean = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function resolveCanonicalSportsReference<TCanonical extends CanonicalCatalogReference>(
  input: CanonicalSportsReadInput,
  adapter: CanonicalSportsReadAdapter<TCanonical>,
): CanonicalSportsReadResolution<TCanonical> {
  const canonicalId = clean(input.canonicalId);
  const legacyValue = clean(input.legacyValue);

  if (canonicalId) {
    const canonical = adapter.findCanonicalById(canonicalId);
    if (!canonical || !adapter.isCoherentHistoricalReference(canonical)) {
      return {
        status: 'invalid_reference',
        canonical: null,
        legacyValue,
        displayFallback: legacyValue,
      };
    }
    return {
      status: 'canonical',
      canonical,
      legacyValue,
      displayFallback: legacyValue,
    };
  }

  if (!legacyValue) {
    return { status: 'empty', canonical: null, legacyValue: null, displayFallback: null };
  }

  const matches = adapter.findLegacyMatches(legacyValue);
  if (matches.length === 1) {
    return {
      status: 'legacy_mapped',
      canonical: matches[0].canonical,
      legacyValue: matches[0].normalizedLegacyValue,
      displayFallback: matches[0].normalizedLegacyValue,
    };
  }
  if (matches.length > 1) {
    return { status: 'ambiguous', canonical: null, legacyValue, displayFallback: legacyValue };
  }
  return { status: 'legacy_raw', canonical: null, legacyValue, displayFallback: legacyValue };
}

export type CanonicalSportsWriteIntent =
  | { kind: 'absent' }
  | { kind: 'reset' }
  | { kind: 'legacy'; legacyValue: string }
  | { kind: 'canonical'; canonicalId: string };

export type CanonicalSportsWritePayload = {
  canonicalId?: unknown;
  legacyValue?: unknown;
  reset?: unknown;
};

export class CanonicalSportsCompatibilityError extends Error {
  constructor(public readonly code: 'conflicting_input' | 'invalid_input' | 'invalid_reference') {
    super(code);
    this.name = 'CanonicalSportsCompatibilityError';
  }
}

export function parseCanonicalSportsWriteIntent(payload: CanonicalSportsWritePayload): CanonicalSportsWriteIntent {
  const hasCanonical = Object.prototype.hasOwnProperty.call(payload, 'canonicalId');
  const hasLegacy = Object.prototype.hasOwnProperty.call(payload, 'legacyValue');
  const hasReset = Object.prototype.hasOwnProperty.call(payload, 'reset');

  if (!hasCanonical && !hasLegacy && !hasReset) return { kind: 'absent' };
  if (hasReset) {
    if (payload.reset !== true || hasCanonical || hasLegacy) {
      throw new CanonicalSportsCompatibilityError('conflicting_input');
    }
    return { kind: 'reset' };
  }
  if (hasCanonical && hasLegacy) throw new CanonicalSportsCompatibilityError('conflicting_input');
  if (hasCanonical) {
    const canonicalId = typeof payload.canonicalId === 'string' ? clean(payload.canonicalId) : null;
    if (!canonicalId) throw new CanonicalSportsCompatibilityError('invalid_input');
    return { kind: 'canonical', canonicalId };
  }
  const legacyValue = typeof payload.legacyValue === 'string' ? clean(payload.legacyValue) : null;
  if (!legacyValue) throw new CanonicalSportsCompatibilityError('invalid_input');
  return { kind: 'legacy', legacyValue };
}

export type CanonicalSportsWritePlan<TCanonical extends CanonicalCatalogReference> =
  | { action: 'no_change' }
  | { action: 'write'; source: 'reset' | 'legacy_mapped' | 'legacy_raw' | 'ambiguous' | 'canonical'; canonical: TCanonical | null; canonicalId: string | null; legacyValue: string | null };

export type CanonicalSportsWriteAdapter<TCanonical extends CanonicalCatalogReference> = {
  findCanonicalById: (id: string) => TCanonical | null;
  findLegacyMatches: (legacyValue: string) => readonly LegacyCatalogMatch<TCanonical>[];
  isCoherentNewReference: (canonical: TCanonical) => boolean;
  projectStableLegacyValue: (canonical: TCanonical) => string | null;
};

export function planCanonicalSportsWrite<TCanonical extends CanonicalCatalogReference>(
  intent: CanonicalSportsWriteIntent,
  adapter: CanonicalSportsWriteAdapter<TCanonical>,
): CanonicalSportsWritePlan<TCanonical> {
  if (intent.kind === 'absent') return { action: 'no_change' };
  if (intent.kind === 'reset') {
    return { action: 'write', source: 'reset', canonical: null, canonicalId: null, legacyValue: null };
  }
  if (intent.kind === 'canonical') {
    const canonical = adapter.findCanonicalById(intent.canonicalId);
    if (!canonical || !canonical.isActive || !adapter.isCoherentNewReference(canonical)) {
      throw new CanonicalSportsCompatibilityError('invalid_reference');
    }
    return {
      action: 'write',
      source: 'canonical',
      canonical,
      canonicalId: canonical.id,
      legacyValue: adapter.projectStableLegacyValue(canonical),
    };
  }

  const matches = adapter.findLegacyMatches(intent.legacyValue);
  if (matches.length === 1) {
    const match = matches[0];
    if (match.canonical.isActive && adapter.isCoherentNewReference(match.canonical)) {
      return {
        action: 'write',
        source: 'legacy_mapped',
        canonical: match.canonical,
        canonicalId: match.canonical.id,
        legacyValue: match.normalizedLegacyValue,
      };
    }
  }
  return {
    action: 'write',
    source: matches.length > 1 ? 'ambiguous' : 'legacy_raw',
    canonical: null,
    canonicalId: null,
    legacyValue: intent.legacyValue,
  };
}
