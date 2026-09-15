'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { CanonicalCountryRead } from '@/lib/geo/countryCatalog';
import { canonicalGeographyHttpLoader } from './canonicalGeographyContracts';

export default function CanonicalCountrySelect({ value, onChange, label, required = false }: {
  value: string;
  onChange: (countryId: string) => void;
  label: string;
  required?: boolean;
}) {
  const { locale, t } = useI18n();
  const [countries, setCountries] = useState<CanonicalCountryRead[]>([]);
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
  useEffect(() => {
    const controller = new AbortController();
    canonicalGeographyHttpLoader.countries(controller.signal).then(setCountries).catch(() => setCountries([]));
    return () => controller.abort();
  }, []);
  return <label className="flex min-w-0 flex-col gap-1">
    <span className="text-sm font-medium text-slate-700">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>
    <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} required={required}>
      <option value="">— {t('geo.selectCountry')} —</option>
      {countries.map((country) => <option key={country.id} value={country.id}>{names.of(country.iso2) ?? country.officialName}</option>)}
    </select>
  </label>;
}
