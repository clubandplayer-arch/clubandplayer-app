'use client';

import { useEffect, useMemo, useState } from 'react';
import { LocationFields, LocationFallback, LocationSelection } from '@/components/profiles/LocationFields';
import { COUNTRIES } from '@/lib/opps/geo';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function InterestAreaForm() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [uid, setUid] = useState<string | null>(null);

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

  // load iniziale
  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      const u = ures?.user ?? null;
      if (!u) return;
      setUid(u.id);

      const { data: p } = await supabase
        .from('profiles')
        .select('interest_country, interest_region_id, interest_province_id, interest_municipality_id')
        .eq('id', u.id)
        .maybeSingle();

      if (p) {
        if (p.interest_country) setCountry(p.interest_country);
        setLocation({
          regionId: p.interest_region_id ?? null,
          provinceId: p.interest_province_id ?? null,
          municipalityId: p.interest_municipality_id ?? null,
          regionName: null,
          provinceName: null,
          cityName: null,
        });
        setFallback({
          region: null,
          province: null,
          city: null,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    setMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({
        interest_country: country || null,
        interest_region_id: location.regionId || null,
        interest_province_id: location.provinceId || null,
        interest_municipality_id: location.municipalityId || null,
      })
      .eq('id', uid);

    setSaving(false);
    if (error) setMsg(`Errore: ${error.message}`);
    else setMsg('Salvato.');
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
          <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
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
          />
        ) : (
          <div className="md:col-span-3 text-sm text-gray-600">
            La zona di interesse è supportata solo per località italiane.
          </div>
        )}
      </div>

      <div>
        <button onClick={save} disabled={saving} className="btn btn-brand">
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
