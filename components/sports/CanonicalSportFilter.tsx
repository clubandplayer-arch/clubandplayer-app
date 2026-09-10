'use client';

import { useEffect, useState } from 'react';
import type { CanonicalSportFormValue } from '@/lib/taxonomy/canonicalSportFormPayload';
import {
  hydrateCanonicalSportValue,
  type LegacySportMapping,
} from '@/lib/taxonomy/canonicalSportSelector';

type Sport = { id: string; code: string; canonical_name: string };
export type CanonicalSportFilterValue = CanonicalSportFormValue;

type Props = {
  idPrefix: string;
  value: CanonicalSportFilterValue;
  onChange: (value: CanonicalSportFilterValue) => void;
  labels: { sport: string; allSports: string; catalogUnavailable: string };
  sportLabel?: (sport: Sport) => string;
};

const EMPTY_CATALOG = {
  sports: [] as Sport[],
  legacySports: [] as LegacySportMapping[],
};

export default function CanonicalSportFilter({ idPrefix, value, onChange, labels, sportLabel }: Props) {
  const [catalog, setCatalog] = useState(EMPTY_CATALOG);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/sports/catalog?ui=single-sport-v3', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !Array.isArray(payload.legacySports) || payload.legacySports.length === 0) {
          throw new Error('sport_catalog_unavailable');
        }
        const nextCatalog = {
          sports: Array.isArray(payload.sports) ? payload.sports : [],
          legacySports: Array.isArray(payload.legacySports) ? payload.legacySports : [],
        };
        setCatalog(nextCatalog);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setLoadFailed(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Legacy rows/deep links have only the old label. Hydrate the complete canonical
    // chain from that label so roles and categories keep using their established key.
    const hydrated = hydrateCanonicalSportValue(catalog.legacySports, value);
    if (hydrated && (hydrated.sportId !== value.sportId
      || hydrated.disciplineId !== value.disciplineId
      || hydrated.variantId !== value.variantId
      || hydrated.legacySport !== value.legacySport)) {
      onChange(hydrated);
    }
  }, [catalog.legacySports, onChange, value]);

  return (
    <div className="w-full max-w-md">
      <label className="space-y-2 text-sm text-slate-700" htmlFor={`${idPrefix}-sport`}>
        <span className="font-medium">{labels.sport}</span>
        <select
          id={`${idPrefix}-sport`}
          value={value.legacySport}
          onChange={(event) => {
            const legacySport = catalog.legacySports.find((item) => item.legacyValue === event.target.value);
            onChange({
              sportId: legacySport?.sportId ?? '',
              disciplineId: legacySport?.disciplineId ?? '',
              variantId: legacySport?.variantId ?? '',
              legacySport: legacySport?.legacyValue ?? '',
            });
          }}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-100"
          disabled={loadFailed}
        >
          <option value="">{loadFailed ? labels.catalogUnavailable : labels.allSports}</option>
          {catalog.legacySports.map((legacySport) => {
            const sport = catalog.sports.find((item) => item.id === legacySport.sportId);
            return <option key={legacySport.legacyValue} value={legacySport.legacyValue}>{sportLabel && sport ? sportLabel({ ...sport, code: legacySport.legacyValue }) : legacySport.legacyValue}</option>;
          })}
        </select>
      </label>
    </div>
  );
}
