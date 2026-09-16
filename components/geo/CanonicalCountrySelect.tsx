'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { CanonicalCountryRead } from '@/lib/geo/countryCatalog';
import { canonicalGeographyHttpLoader } from './canonicalGeographyContracts';

export default function CanonicalCountrySelect({ value, onChange, disabled=false, required=false, label='Paese' }: {
  value: string;
  onChange: (countryId: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}) {
  const { locale, t } = useI18n();
  const [countries, setCountries] = useState<CanonicalCountryRead[]>([]);
  const [failed, setFailed] = useState(false);
  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);

  useEffect(() => {
    const controller = new AbortController();
    canonicalGeographyHttpLoader.countries(controller.signal).then(setCountries).catch((error) => {
      if (error?.name !== 'AbortError') setFailed(true);
    });
    return () => controller.abort();
  }, []);

  return <div className="flex min-w-0 flex-col gap-2">
    <label className="text-sm font-medium text-slate-700">
      {label}{required && <span className="ml-1 font-semibold text-red-600" aria-hidden="true">*</span>}
    </label>
    <select className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-100"
      value={value} disabled={disabled || failed} required={required} onChange={(event) => onChange(event.target.value)}>
      <option value="">— {failed ? t('sports.catalogUnavailable') : t('profile.select')} —</option>
      {countries.map((country) => <option key={country.id} value={country.id}>
        {countryNames.of(country.iso2) ?? country.officialName}
      </option>)}
    </select>
  </div>;
}
