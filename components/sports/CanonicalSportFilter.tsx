'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CanonicalSportFormValue } from '@/lib/taxonomy/canonicalSportFormPayload';
import {
  hydrateCanonicalSportValue,
  resolveLegacySportValue,
  type LegacySportMapping,
} from '@/lib/taxonomy/canonicalSportSelector';

type Sport = { id: string; code: string; canonical_name: string };
type Discipline = { id: string; sport_id: string; code: string; canonical_name: string };
type Variant = { id: string; discipline_id: string; code: string; canonical_name: string };
export type CanonicalSportFilterValue = CanonicalSportFormValue;

type Props = {
  idPrefix: string;
  value: CanonicalSportFilterValue;
  onChange: (value: CanonicalSportFilterValue) => void;
  labels: { sport: string; allSports: string; discipline: string; allDisciplines: string; variant: string; allVariants: string; catalogUnavailable: string };
  sportLabel?: (sport: Sport) => string;
};

const EMPTY_CATALOG = {
  sports: [] as Sport[],
  disciplines: [] as Discipline[],
  variants: [] as Variant[],
  legacySports: [] as LegacySportMapping[],
};

export default function CanonicalSportFilter({ idPrefix, value, onChange, labels, sportLabel }: Props) {
  const [catalog, setCatalog] = useState(EMPTY_CATALOG);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/sports/catalog', { cache: 'force-cache', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error('sport_catalog_unavailable');
        const nextCatalog = {
          sports: Array.isArray(payload.sports) ? payload.sports : [],
          disciplines: Array.isArray(payload.disciplines) ? payload.disciplines : [],
          variants: Array.isArray(payload.variants) ? payload.variants : [],
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

  const disciplines = useMemo(
    () => catalog.disciplines.filter((item) => item.sport_id === value.sportId),
    [catalog.disciplines, value.sportId],
  );
  const variants = useMemo(
    () => catalog.variants.filter((item) => item.discipline_id === value.disciplineId),
    [catalog.variants, value.disciplineId],
  );

  function legacyValueFor(sportId: string, disciplineId: string, variantId: string, fallback: string) {
    return resolveLegacySportValue(catalog.legacySports, sportId, disciplineId, variantId, fallback);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
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

      <label className="space-y-2 text-sm text-slate-700" htmlFor={`${idPrefix}-discipline`}>
        <span className="font-medium">{labels.discipline}</span>
        <select
          id={`${idPrefix}-discipline`}
          value={value.disciplineId}
          onChange={(event) => {
            const disciplineId = event.target.value;
            onChange({
              ...value,
              disciplineId,
              variantId: '',
              legacySport: legacyValueFor(value.sportId, disciplineId, '', value.legacySport),
            });
          }}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-100"
          disabled={!value.sportId || disciplines.length === 0}
        >
          <option value="">{labels.allDisciplines}</option>
          {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.canonical_name}</option>)}
        </select>
      </label>

      <label className="space-y-2 text-sm text-slate-700" htmlFor={`${idPrefix}-variant`}>
        <span className="font-medium">{labels.variant}</span>
        <select
          id={`${idPrefix}-variant`}
          value={value.variantId}
          onChange={(event) => {
            const variantId = event.target.value;
            onChange({
              ...value,
              variantId,
              legacySport: legacyValueFor(value.sportId, value.disciplineId, variantId, value.legacySport),
            });
          }}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-100"
          disabled={!value.disciplineId || variants.length === 0}
        >
          <option value="">{labels.allVariants}</option>
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.canonical_name}</option>)}
        </select>
      </label>
    </div>
  );
}
