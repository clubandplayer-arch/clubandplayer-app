'use client';

import { useCallback, useEffect, useState } from 'react';
import CanonicalGeographySelector from '@/components/geo/CanonicalGeographySelector';
import { useI18n } from '@/components/i18n/I18nProvider';

type CountryInterest = { country_id: string; country?: { official_name?: string; iso2?: string } | Array<{ official_name?: string; iso2?: string }> | null };
type AreaInterest = { geo_area_id: string; area?: { official_name?: string; area_type?: string } | Array<{ official_name?: string; area_type?: string }> | null };

const relation = <T,>(value: T | T[] | null | undefined) => Array.isArray(value) ? value[0] : value;

export default function GeographicInterestsForm({ title }: { title?: string } = {}) {
  const { t } = useI18n();
  const [countryId, setCountryId] = useState<string | null>(null);
  const [geoAreaId, setGeoAreaId] = useState<string | null>(null);
  const [countryInterests, setCountryInterests] = useState<CountryInterest[]>([]);
  const [areaInterests, setAreaInterests] = useState<AreaInterest[]>([]);
  const [openToRelocation, setOpenToRelocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile-geography/interests', { credentials: 'include', cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || t('geoInterests.loadError'));
      setCountryInterests(Array.isArray(json?.data?.countryInterests) ? json.data.countryInterests : []);
      setAreaInterests(Array.isArray(json?.data?.geoAreaInterests) ? json.data.geoAreaInterests : []);
      setOpenToRelocation(json?.data?.openToRelocation === true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('geoInterests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile-geography/interests', {
        method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || t('geoInterests.saveError'));
      await load();
      setMessage(t('geoInterests.saved'));
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('geoInterests.saveError'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h2 className="mt-0 text-xl font-semibold">{title ?? t('geoInterests.title')}</h2>
      <p className="mb-4 text-sm text-slate-600">{t('geoInterests.help')}</p>

      {message ? <p role="status" className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}
      {loading ? <p>{t('common.loading')}</p> : <div className="space-y-5">
        <label className="flex items-start gap-3 rounded-lg bg-sky-50 p-3">
          <input type="checkbox" className="mt-1" checked={openToRelocation} disabled={saving} onChange={(event) => void patch({ openToRelocation: event.target.checked })} />
          <span><strong className="block">{t('geoInterests.relocation')}</strong><span className="text-sm text-slate-600">{t('geoInterests.relocationHelp')}</span></span>
        </label>

        <CanonicalGeographySelector countryId={countryId} geoAreaId={geoAreaId} onCountryChange={setCountryId} onGeoAreaChange={setGeoAreaId} disabled={saving} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={saving || !countryId || countryInterests.some((item) => item.country_id === countryId)} onClick={() => void patch({ countryInterest: { countryId, selected: true } })}>{t('geoInterests.addCountry')}</button>
          <button type="button" className="btn btn-outline" disabled={saving || !geoAreaId || areaInterests.some((item) => item.geo_area_id === geoAreaId)} onClick={async () => { if (await patch({ geoAreaInterest: { geoAreaId, selected: true } })) setGeoAreaId(null); }}>{t('geoInterests.addArea')}</button>
        </div>

        <div>
          <h3 className="font-semibold">{t('geoInterests.countries')}</h3>
          {!countryInterests.length ? <p className="text-sm text-slate-500">{t('geoInterests.none')}</p> : <ul className="mt-2 flex flex-wrap gap-2">{countryInterests.map((item) => { const country = relation(item.country); return <li key={item.country_id} className="flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm"><span>{country?.official_name || country?.iso2 || item.country_id}</span><button type="button" disabled={saving} aria-label={t('geoInterests.removeCountry')} onClick={() => void patch({ countryInterest: { countryId: item.country_id, selected: false } })}>×</button></li>; })}</ul>}
        </div>
        <div>
          <h3 className="font-semibold">{t('geoInterests.areas')}</h3>
          {!areaInterests.length ? <p className="text-sm text-slate-500">{t('geoInterests.none')}</p> : <ul className="mt-2 flex flex-wrap gap-2">{areaInterests.map((item) => { const area = relation(item.area); return <li key={item.geo_area_id} className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm"><span>{area?.official_name || item.geo_area_id}</span><button type="button" disabled={saving} aria-label={t('geoInterests.removeArea')} onClick={() => void patch({ geoAreaInterest: { geoAreaId: item.geo_area_id, selected: false } })}>×</button></li>; })}</ul>}
        </div>
      </div>}
    </section>
  );
}
