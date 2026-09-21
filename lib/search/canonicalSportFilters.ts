const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CanonicalSportFilters = {
  sportId: string;
  disciplineId: string | null;
  variantId: string | null;
};

export class CanonicalSportFilterError extends Error {
  constructor(
    public readonly code:
      | "invalid_sport_id"
      | "invalid_discipline_id"
      | "invalid_variant_id"
      | "invalid_sport_chain",
  ) {
    super(code);
    this.name = "CanonicalSportFilterError";
  }
}

export function parseCanonicalSportFilters(
  params: URLSearchParams,
): CanonicalSportFilters | null {
  const sportId = (
    params.get("sportId") ||
    params.get("sport_id") ||
    ""
  ).trim();
  const disciplineId = (
    params.get("disciplineId") ||
    params.get("sport_discipline_id") ||
    ""
  ).trim();
  const variantId = (
    params.get("variantId") ||
    params.get("sport_variant_id") ||
    ""
  ).trim();
  if (!sportId && !disciplineId && !variantId) return null;
  if (!sportId || (variantId && !disciplineId))
    throw new CanonicalSportFilterError("invalid_sport_chain");
  if (!UUID_RE.test(sportId))
    throw new CanonicalSportFilterError("invalid_sport_id");
  if (disciplineId && !UUID_RE.test(disciplineId))
    throw new CanonicalSportFilterError("invalid_discipline_id");
  if (variantId && !UUID_RE.test(variantId))
    throw new CanonicalSportFilterError("invalid_variant_id");
  return {
    sportId,
    disciplineId: disciplineId || null,
    variantId: variantId || null,
  };
}

export function applyCanonicalSportFilters(
  query: any,
  filters: CanonicalSportFilters,
  legacySport?: string | null,
) {
  if (legacySport?.trim()) {
    const quotedLegacySport = `"${legacySport.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const canonicalParts = [`sport_id.eq.${filters.sportId}`];
    if (filters.disciplineId)
      canonicalParts.push(`sport_discipline_id.eq.${filters.disciplineId}`);
    if (filters.variantId)
      canonicalParts.push(`sport_variant_id.eq.${filters.variantId}`);
    // Canonical rows use the UUID chain; pre-backfill rows remain discoverable through
    // the exact legacy label that the single Sport selector also submits.
    return query.or(
      `and(${canonicalParts.join(",")}),sport.ilike.${quotedLegacySport}`,
    );
  }
  let next = query.eq("sport_id", filters.sportId);
  if (filters.disciplineId)
    next = next.eq("sport_discipline_id", filters.disciplineId);
  if (filters.variantId) next = next.eq("sport_variant_id", filters.variantId);
  return next;
}

/**
 * Matches one selectable sport, rather than every selection in the same
 * canonical sport family. Null discipline/variant values are significant:
 * Football, Futsal and the numbered football variants can share sport_id,
 * while remaining distinct choices for discovery purposes.
 */
export function applyExactCanonicalSportFilters(
  query: any,
  filters: CanonicalSportFilters,
  legacySport?: string | null,
) {
  if (legacySport?.trim()) {
    const quotedLegacySport = `"${legacySport.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const canonicalParts = [
      `sport_id.eq.${filters.sportId}`,
      filters.disciplineId
        ? `sport_discipline_id.eq.${filters.disciplineId}`
        : "sport_discipline_id.is.null",
      filters.variantId
        ? `sport_variant_id.eq.${filters.variantId}`
        : "sport_variant_id.is.null",
    ];
    return query.or(
      `and(${canonicalParts.join(",")}),and(sport_id.is.null,sport.ilike.${quotedLegacySport})`,
    );
  }

  let next = query.eq("sport_id", filters.sportId);
  next = filters.disciplineId
    ? next.eq("sport_discipline_id", filters.disciplineId)
    : next.is("sport_discipline_id", null);
  return filters.variantId
    ? next.eq("sport_variant_id", filters.variantId)
    : next.is("sport_variant_id", null);
}
