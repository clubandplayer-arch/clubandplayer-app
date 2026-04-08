'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AvatarUploader from '@/components/profiles/AvatarUploader';
import { LocationFallback, LocationFields, LocationSelection } from '@/components/profiles/LocationFields';
import { WORLD_COUNTRY_OPTIONS } from '@/lib/geo/countries';
import { iso2ToFlagEmoji } from '@/lib/utils/flags';

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

        setFullName(data.full_name ?? data.display_name ?? '');
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
        full_name: fullName.trim() || null,
        display_name: fullName.trim() || null,
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

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Salvataggio non riuscito');

      setMessage('Profilo fan aggiornato correttamente.');
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">{message}</p> : null}

      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Dati personali</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm text-gray-600">Foto profilo</label>
            <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>La foto viene mostrata nelle mini-card della bacheca.</span>
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
            <label className="text-sm text-gray-600">Nome e cognome</label>
            <input
              className="w-full min-w-0 rounded-lg border p-2"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Es. Mario Rossi"
              disabled={loading}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Nazionalità</label>
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
        <h2 className="mb-3 text-lg font-semibold">Zona di interesse</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm text-gray-600">Paese</label>
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
            labels={{ region: 'Regione', province: 'Provincia', city: 'Città' }}
            disabled={loading}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading || saving} className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
      </div>
    </form>
  );
}
