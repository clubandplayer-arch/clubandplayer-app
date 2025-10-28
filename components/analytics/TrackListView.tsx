'use client';

import { useEffect, useMemo } from 'react';
import { captureSafe } from '@/lib/analytics';

type Props = {
  /** es. "opportunities", "athletes", ecc. */
  scope: string;
  /** filtri applicati alla lista (opzionale) */
  filters?: Record<string, unknown>;
  /** numero elementi mostrati (opzionale) */
  count?: number;
};

/**
 * Traccia una "list_view" per una certa scope.
 * Esempio evento: "opportunities_list_view"
 */
export default function TrackListView({ scope, filters, count }: Props) {
  // Normalizza e stabilizza i filtri per l’effetto
  const safeFilters = useMemo(() => sanitize(filters), [filters]);
  const filtersKey = useMemo(() => JSON.stringify(safeFilters ?? {}), [safeFilters]);

  useEffect(() => {
    try {
      const event = `${scope}_list_view`;
      captureSafe(event, {
        scope,
        count: typeof count === 'number' ? count : undefined,
        filters: safeFilters,
      });
    } catch {
      /* no-op */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, filtersKey, count]);

  return null;
}

function sanitize(obj?: Record<string, unknown>) {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    switch (typeof v) {
      case 'string':
        out[k] = v.slice(0, 200);
        break;
      case 'number':
      case 'boolean':
        out[k] = v;
        break;
      default:
        try {
          out[k] = JSON.stringify(v).slice(0, 300);
        } catch {
          out[k] = String(v).slice(0, 200);
        }
    }
  }
  return Object.keys(out).length ? out : undefined;
}
