'use client';

import { useEffect, useMemo, useState } from 'react';
import { LocationFields, LocationFallback, LocationSelection } from '@/components/profiles/LocationFields';
import { COUNTRIES } from '@/lib/opps/geo';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function InterestAreaForm() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [country, setCountry] = useState('IT');
  const [location, setLocation] = useState<LocationSelection>({
    regionId: null,
    provinceId: null,
    municipalityId: null,
    regionName: null,
    provinceName: null,
    cityName: null,
  });
  const [fallback, setFallback] = useState<LocationFallback>({});

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // load iniziale
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/profiles/me', { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        const p = json?.data ?? null;
        if (!p || cancelled) return;

        if (p.interest_country) setCountry(p.interest_country);
        setLocation({
          regionId: p.interest_region_id ?? null,
          provinceId: p.interest_province_id ?? null,
          municipalityId: p.interest_municipality_id ?? null,
          regionName: p.interest_region ?? null,
          provinceName: p.interest_province ?? null,
          cityName: p.interest_city ?? null,
        });
        setFallback({
          region: p.interest_region ?? null,
          province: p.interest_province ?? null,
          city: p.interest_city ?? null,
        });
      } catch (error) {
        console.error('[InterestAreaForm] load failed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    const payload =
      country === 'IT'
        ? {
            interest_country: country || null,
            interest_region_id: location.regionId || null,
            interest_province_id: location.provinceId || null,
            interest_municipality_id: location.municipalityId || null,
            interest_region: location.regionName || fallback.region || null,
            interest_province: location.provinceName || fallback.province || null,
            interest_city: location.cityName || fallback.city || null,
          }
        : {
            interest_country: country || null,
            interest_region_id: null,
            interest_province_id: null,
            interest_municipality_id: null,
            interest_region: null,
            interest_province: null,
            interest_city: null,
          };

    try {
      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Errore salvataggio');
      setMsg('Salvato.');
    } catch (error: any) {
      setMsg(`Errore: ${error?.message || 'Salvataggio non riuscito'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {msg && (
        <p className={`text-sm ${msg.startsWith('Errore') ? 'text-red-600' : 'text-green-700'}`}>
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="label">
          Paese
          <select className="select" value={country} onChange={(e) => setCountry(e.target.value)} disabled={loading}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </label>

        {country === 'IT' ? (
          <LocationFields
            supabase={supabase}
            country={country}
            value={location}
            fallback={fallback}
            onChange={setLocation}
            labels={{ region: 'Regione', province: 'Provincia', city: 'Città' }}
            disabled={loading}
          />
        ) : (
          <div className="md:col-span-3 text-sm text-gray-600">
            La zona di interesse è supportata solo per località italiane.
          </div>
        )}
      </div>

      <div>
        <button onClick={save} disabled={saving || loading} className="btn btn-brand">
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
