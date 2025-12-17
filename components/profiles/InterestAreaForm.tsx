'use client';

import { useEffect, useMemo, useState } from 'react';
import { LocationFields, LocationValue } from '@/components/profiles/LocationFields';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function InterestAreaForm() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [uid, setUid] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue>({
    interest_country: 'IT',
    interest_region: null,
    interest_province: null,
    interest_city: null,
  });

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
        .select('interest_country, interest_region, interest_province, interest_city')
        .eq('id', u.id)
        .maybeSingle();

      if (p) {
        setLocation({
          interest_country: (p as any)?.interest_country || 'IT',
          interest_region: (p as any)?.interest_region || null,
          interest_province: (p as any)?.interest_province || null,
          interest_city: (p as any)?.interest_city || null,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    setMsg('');
    const interestValue = location as {
      interest_country?: string | null;
      interest_region?: string | null;
      interest_province?: string | null;
      interest_city?: string | null;
      interest_region_id?: number | null;
      interest_province_id?: number | null;
      interest_municipality_id?: number | null;
    };
    const interestCountry = (interestValue.interest_country || 'IT').trim() || 'IT';
    const { error } = await supabase
      .from('profiles')
      .update({
        interest_country: interestValue.interest_country || null,
        interest_region: interestValue.interest_region || null,
        interest_province: interestValue.interest_province || null,
        interest_city: interestValue.interest_city || null,
        interest_region_id: interestCountry === 'IT' ? interestValue.interest_region_id ?? null : null,
        interest_province_id: interestCountry === 'IT' ? interestValue.interest_province_id ?? null : null,
        interest_municipality_id: interestCountry === 'IT' ? interestValue.interest_municipality_id ?? null : null,
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

      <LocationFields
        supabase={supabase}
        mode="interest"
        value={location}
        onChange={setLocation as (v: LocationValue) => void}
        label="Zona di interesse"
      />

      <div>
        <button onClick={save} disabled={saving} className="btn btn-brand">
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
