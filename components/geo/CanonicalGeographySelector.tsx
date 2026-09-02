'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { CanonicalCountryRead } from '@/lib/geo/countryCatalog';
import { canonicalGeographyHttpLoader, type CanonicalGeographyLoader } from './canonicalGeographyContracts';
import { applyCanonicalLevelSelection, loadCanonicalHierarchy, type CanonicalGeographyLevel } from './canonicalGeographySelectorModel';
import { useI18n } from '@/components/i18n/I18nProvider';

export type CanonicalGeographyLabels = {
  country: string;
  area: string;
  areaType?: Partial<Record<string, string>>;
  selectCountry: string;
  selectArea: string;
  loading: string;
  empty: string;
  retry: string;
  reset: string;
};

const DEFAULT_LABELS: CanonicalGeographyLabels = {
  country: 'Paese', area: 'Area geografica', selectCountry: 'Seleziona un Paese', selectArea: 'Seleziona un’area',
  loading: 'Caricamento…', empty: 'Nessuna area disponibile', retry: 'Riprova', reset: 'Azzera selezione',
  areaType: {
    REGION: 'Regione', DEPARTMENT: 'Dipartimento', COMMUNE: 'Comune', AUTONOMOUS_COMMUNITY: 'Comunità autonoma',
    PROVINCE: 'Provincia', MUNICIPALITY: 'Comune', CANTON: 'Cantone', DISTRICT: 'Distretto',
    STATISTICAL_REGION: 'Regione statistica', VOIVODESHIP: 'Voivodato', POWIAT: 'Powiat', GMINA: 'Gmina',
  },
};

export type CanonicalGeographySelectorProps = {
  countryId: string | null;
  geoAreaId: string | null;
  onCountryChange: (countryId: string | null) => void;
  onGeoAreaChange: (geoAreaId: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  labels?: Partial<CanonicalGeographyLabels>;
  loader?: CanonicalGeographyLoader;
  idPrefix?: string;
};

export default function CanonicalGeographySelector({
  countryId, geoAreaId, onCountryChange, onGeoAreaChange, disabled = false, required = false,
  error: externalError, labels: labelOverrides, loader = canonicalGeographyHttpLoader, idPrefix,
}: CanonicalGeographySelectorProps) {
  const { locale, t } = useI18n();
  const reactId = useId();
  const baseId = idPrefix ?? `canonical-geo-${reactId.replace(/:/g, '')}`;
  const labels = useMemo(() => ({
    ...DEFAULT_LABELS,
    country: t('map.country'), area: t('map.area'), selectCountry: t('geo.selectCountry'), selectArea: t('map.selectArea'),
    loading: t('common.loading'), empty: t('map.noAreas'), retry: t('common.retry'), reset: t('map.reset'),
    ...labelOverrides,
    areaType: { ...DEFAULT_LABELS.areaType, ...labelOverrides?.areaType },
  }), [labelOverrides, t]);
  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
  const [countries, setCountries] = useState<CanonicalCountryRead[]>([]);
  const [levels, setLevels] = useState<CanonicalGeographyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectedCountry = countries.find((country) => country.id === countryId) ?? null;
  const error = externalError || internalError;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setInternalError(null);
    loader.countries(controller.signal).then(setCountries).catch((reason) => {
      if (reason?.name !== 'AbortError') setInternalError(reason instanceof Error ? reason.message : 'Errore di caricamento');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [loader, reloadKey]);

  useEffect(() => {
    if (!selectedCountry) { setLevels([]); return; }
    const controller = new AbortController();
    setLoading(true); setInternalError(null);
    (async () => {
      setLevels(await loadCanonicalHierarchy(loader, selectedCountry, geoAreaId, controller.signal));
    })().catch((reason) => {
      if (reason?.name !== 'AbortError') { setLevels([]); setInternalError(reason instanceof Error ? reason.message : 'Errore di caricamento'); }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [geoAreaId, loader, reloadKey, selectedCountry]);

  const changeCountry = (nextId: string) => {
    onCountryChange(nextId || null);
    onGeoAreaChange(null);
    setLevels([]);
  };

  const changeLevel = useCallback(async (index: number, nextId: string) => {
    if (!selectedCountry) return;
    const selection = applyCanonicalLevelSelection(levels, index, nextId || null);
    const retained = selection.levels;
    setLevels(retained);
    onGeoAreaChange(selection.value);
    if (!nextId) return;
    setLoading(true); setInternalError(null);
    try {
      const children = await loader.children(selectedCountry.iso2, nextId);
      if (children.length) setLevels([...retained, { options: children, selectedId: null }]);
    } catch (reason) {
      setInternalError(reason instanceof Error ? reason.message : 'Errore di caricamento');
    } finally { setLoading(false); }
  }, [levels, loader, onGeoAreaChange, selectedCountry]);

  return (
    <fieldset className="space-y-4" disabled={disabled} aria-busy={loading} aria-describedby={error ? `${baseId}-error` : undefined}>
      <legend className="sr-only">{labels.area}</legend>
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1" htmlFor={`${baseId}-country`}>
          <span className="text-sm font-medium text-slate-700">{labels.country}{required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}</span>
          <select id={`${baseId}-country`} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100" value={countryId ?? ''} onChange={(event) => changeCountry(event.target.value)} required={required} aria-invalid={Boolean(error)}>
            <option value="">{labels.selectCountry}</option>
            {countries.map((country) => <option key={country.id} value={country.id}>{countryNames.of(country.iso2) ?? country.officialName}</option>)}
          </select>
        </label>
        {levels.map((level, index) => {
          const types = Array.from(new Set(level.options.map((option) => option.area_type)));
          const typeLabel = types.length === 1 ? labels.areaType?.[types[0]] : labels.area;
          return <label className="flex min-w-0 flex-col gap-1" htmlFor={`${baseId}-level-${index}`} key={`${index}-${level.options[0]?.parent_id ?? 'root'}`}>
            <span className="text-sm font-medium text-slate-700">{typeLabel ?? labels.area}{required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}</span>
            <select id={`${baseId}-level-${index}`} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100" value={level.selectedId ?? ''} onChange={(event) => void changeLevel(index, event.target.value)} required={required && index === 0} aria-invalid={Boolean(error)}>
              <option value="">{level.options.length ? labels.selectArea : labels.empty}</option>
              {level.options.map((option) => <option key={option.id} value={option.id}>{option.official_name}</option>)}
            </select>
          </label>;
        })}
      </div>
      {loading ? <p className="text-sm text-slate-500" role="status">{labels.loading}</p> : null}
      {!loading && selectedCountry && levels.length === 1 && levels[0].options.length === 0 ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{labels.empty}</p> : null}
      {error ? <div id={`${baseId}-error`} className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert"><span>{error}</span><button type="button" className="font-semibold underline focus:outline-none focus:ring-2 focus:ring-red-300" onClick={() => setReloadKey((value) => value + 1)}>{labels.retry}</button></div> : null}
      {(countryId || geoAreaId) ? <button type="button" className="text-sm font-semibold text-sky-800 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-sky-300" disabled={disabled} onClick={() => { onCountryChange(null); onGeoAreaChange(null); setLevels([]); }}>{labels.reset}</button> : null}
    </fieldset>
  );
}
