"use client";

import React, { useMemo } from "react";

type Props = {
  /** Totale risultati dal backend (se disponibile) */
  total?: number | null;
  /** Pagina corrente (>=1) */
  page: number;
  /** Dimensione pagina */
  pageSize: number;
  /** true se ci sono altre pagine successive */
  hasMore: boolean;
  /** Etichetta opzionale */
  label?: string;
};

/**
 * Mostra un badge con conteggio risultati.
 * - Se `total` è noto → mostra il numero esatto.
 * - Se non è noto:
 *   - se hasMore=true → "≥ page*pageSize"
 *   - altrimenti → "~ items correnti" (stima minima)
 */
export default function ResultBadge({
  total,
  page,
  pageSize,
  hasMore,
  label = "Risultati",
}: Props) {
  const text = useMemo(() => {
    if (typeof total === "number") return `${label}: ${total}`;
    const min = (page - 1) * pageSize + 1; // primo item della pagina
    const maxSoFar = page * pageSize;
    return hasMore ? `${label}: ≥ ${maxSoFar}` : `${label}: ~ ${maxSoFar}`;
  }, [total, page, pageSize, hasMore, label]);

  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-slate-600">
      {text}
    </span>
  );
}
