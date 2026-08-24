'use client';
import { useI18n } from '@/components/i18n/I18nProvider';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AvatarUploader from '@/components/profiles/AvatarUploader';
import { LocationFallback, LocationFields, LocationSelection } from '@/components/profiles/LocationFields';
import { WORLD_COUNTRY_OPTIONS } from '@/lib/geo/countries';
import { iso2ToFlagEmoji } from '@/lib/utils/flags';
import { getMissingRequiredProfileFields } from '@/lib/profiles/completion';
import { isValidProfilePersonName, sanitizeProfilePersonName } from '@/lib/profiles/nameValidation';

function RequiredMark() {
  return <span className="ml-1 font-semibold text-red-600" aria-hidden="true">*</span>;
}

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function normalizeCountryCode(value?: string | null): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : trimmed.toUpperCase();
}

function countryName(codeOrText?: string | null) {
  if (!codeOrText) return '';
  const normalized = codeOrText.trim().toUpperCase();
  if (!/^[A-Za-z]{2}$/.test(normalized)) return codeOrText;
  try {
    const dn = new Intl.DisplayNames(['it'], { type: 'region' });
    return dn.of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

export default function FanProfileForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [country, setCountry] = useState('IT');
  const [interestCountry, setInterestCountry] = useState('IT');
  const [interestLocation, setInterestLocation] = useState<LocationSelection>({
    regionId: null,
    provinceId: null,
    municipalityId: null,
    regionName: null,
    provinceName: null,
    cityName: null,
  });
  const [interestFallback, setInterestFallback] = useState<LocationFallback>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await res.json().catch(() => ({}));
        const data = raw?.data ?? raw;
        if (!data || cancelled) return;

        const loadedName = data.full_name ?? data.display_name ?? '';
        setFullName(isValidProfilePersonName(loadedName) ? sanitizeProfilePersonName(loadedName) : '');
        setAvatarUrl(data.avatar_url ?? null);
        setCountry(normalizeCountryCode(data.country) ?? 'IT');
        setInterestCountry(normalizeCountryCode(data.interest_country) ?? 'IT');
        setInterestLocation({
          regionId: data.interest_region_id ?? null,
          provinceId: data.interest_province_id ?? null,
          municipalityId: data.interest_municipality_id ?? null,
          regionName: data.interest_region ?? null,
          provinceName: data.interest_province ?? null,
          cityName: data.interest_city ?? null,
        });
        setInterestFallback({
          region: data.interest_region ?? null,
          province: data.interest_province ?? null,
          city: data.interest_city ?? null,
        });
      } catch {
        if (!cancelled) setError('Impossibile caricare il profilo fan.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const requiredPreviewProfile = useMemo(() => ({
    account_type: 'fan',
    full_name: fullName,
    display_name: fullName,
  }), [fullName]);
  const missingRequiredFields = useMemo(() => getMissingRequiredProfileFields(requiredPreviewProfile), [requiredPreviewProfile]);

  const countryPreview = useMemo(
    () => (country ? [iso2ToFlagEmoji(country), countryName(country)].filter(Boolean).join(' ') : ''),
    [country],
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const normalizedCountry = normalizeCountryCode(country);
      const normalizedInterestCountry = normalizeCountryCode(interestCountry);
      const isInterestItaly = normalizedInterestCountry === 'IT';
      const interestRegionName = interestLocation.regionName || interestFallback.region || null;
      const interestProvinceName = interestLocation.provinceName || interestFallback.province || null;
      const interestCityName = interestLocation.cityName || interestFallback.city || null;

      const payload = {
        account_type: 'fan',
        type: 'fan',
        full_name: sanitizeProfilePersonName(fullName).trim() || null,
        display_name: sanitizeProfilePersonName(fullName).trim() || null,
        avatar_url: avatarUrl || null,
        country: normalizedCountry,
        interest_country: normalizedInterestCountry,
        interest_region_id: isInterestItaly ? interestLocation.regionId : null,
        interest_province_id: isInterestItaly ? interestLocation.provinceId : null,
        interest_municipality_id: isInterestItaly ? interestLocation.municipalityId : null,
        interest_region: isInterestItaly ? interestRegionName : null,
        interest_province: isInterestItaly ? interestProvinceName : null,
        interest_city: interestCityName,

        // pulizia campi non FAN
        bio: null,
        links: null,
        skills: [],
        birth_year: null,
        birth_place: null,
        birth_country: null,
        birth_region_id: null,
        birth_province_id: null,
        birth_municipality_id: null,
        residence_region_id: null,
        residence_province_id: null,
        residence_municipality_id: null,
        foot: null,
        height_cm: null,
        weight_kg: null,
        sport: null,
        role: null,
        club_foundation_year: null,
        club_stadium: null,
        club_stadium_address: null,
        club_stadium_lat: null,
        club_stadium_lng: null,
        club_league_category: null,
        club_motto: null,
      };

      const missingFields = getMissingRequiredProfileFields({
        account_type: 'fan',
        full_name: payload.full_name,
        display_name: payload.display_name,
      });
      if (missingFields.length > 0) {
        throw new Error(`Completa i campi obbligatori: ${missingFields.join(', ')}.`);
      }

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || t('profile.saveFailed'));

      setMessage(t('profile.saved'));
      router.replace('/feed');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {missingRequiredFields.length > 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm" role="alert">
          <p className="font-semibold">{t('profile.completeTitle')}</p>
          <p className="mt-2 text-sm">{t('profile.completeHelp')}</p>
          <p className="mt-2 text-sm">{t('profile.missingFields', { fields: missingRequiredFields.join(', ') })}</p>
        </div>
      ) : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">{message}</p> : null}

      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">{t('profile.personalData')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm text-gray-600">{t('club.photo')}</label>
            <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{t('profile.photoFeedHelp')}</span>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Rimuovi foto
                </button>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1 md:col-span-2">
            <label className="text-sm text-gray-600">{t('profile.fanName')}<RequiredMark /></label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={fullName}
              onChange={(event) => setFullName(sanitizeProfilePersonName(event.target.value))}
              placeholder="Es. Mario Rossi / Ultras Curva Sud"
              disabled={loading}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">{t('profile.nationality')}</label>
            <select
              className="w-full min-w-0 rounded-lg border p-2"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              disabled={loading}
            >
              {WORLD_COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            {countryPreview ? <span className="text-xs text-gray-500">{countryPreview}</span> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">{t('profile.interestArea')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">{t('profile.country')}</label>
            <select
              className="w-full min-w-0 rounded-lg border p-2"
              value={interestCountry}
              onChange={(event) => setInterestCountry(event.target.value)}
              disabled={loading}
            >
              {WORLD_COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <LocationFields
            supabase={supabase}
            country={interestCountry}
            value={interestLocation}
            fallback={interestFallback}
            onChange={setInterestLocation}
            labels={{ region: t('opportunities.region'), province: t('opportunities.province'), city: t('opportunities.city') }}
            disabled={loading}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading || saving} className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? t('common.saving') : t('profile.saveProfile')}
        </button>
      </div>
    </form>
  );
}
