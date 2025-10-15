'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Opt = { id: string; name: string };

export default function InterestAreaForm() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [uid, setUid] = useState<string | null>(null);

  // valori selezionati (string per coerenza con col. text nel profilo)
  const [country, setCountry] = useState('IT');
  const [regionId, setRegionId] = useState<string>('');
  const [provinceId, setProvinceId] = useState<string>('');
  const [cityId, setCityId] = useState<string>('');

  // opzioni
  const [regions, setRegions] = useState<Opt[]>([]);
  const [provinces, setProvinces] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // --- RPC helpers
  const fetchRegions = async () => {
    const { data, error } = await supabase.rpc('location_children', {
      level: 'region',
      parent: null as unknown as string, // ignorato dalla funzione
    });
    if (!error) setRegions((data ?? []) as Opt[]);
  };

  const fetchProvinces = async (rid: string) => {
    if (!rid) { setProvinces([]); return; }
    const { data, error } = await supabase.rpc('location_children', {
      level: 'province',
      parent: String(rid),
    });
    if (!error) setProvinces((data ?? []) as Opt[]);
  };

  const fetchCities = async (pid: string) => {
    if (!pid) { setCities([]); return; }
    const { data, error } = await supabase.rpc('location_children', {
      level: 'municipality',
      parent: String(pid),
    });
    if (!error) setCities((data ?? []) as Opt[]);
  };

  // load iniziale
  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      const u = ures?.user ?? null;
      if (!u) return;
      setUid(u.id);

      await fetchRegions();

      const { data: p } = await supabase
        .from('profiles')
        .select('interest_country, interest_region_id, interest_province_id, interest_municipality_id')
        .eq('id', u.id)
        .maybeSingle();

      if (p) {
        if (p.interest_country) setCountry(p.interest_country);
        if (p.interest_region_id) {
          setRegionId(String(p.interest_region_id));
          await fetchProvinces(String(p.interest_region_id));
        }
        if (p.interest_province_id) {
          setProvinceId(String(p.interest_province_id));
          await fetchCities(String(p.interest_province_id));
        }
        if (p.interest_municipality_id) setCityId(String(p.interest_municipality_id));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cambia regione → reset e carica province
  useEffect(() => {
    setProvinceId('');
    setCityId('');
    fetchProvinces(regionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  // cambia provincia → reset e carica comuni
  useEffect(() => {
    setCityId('');
    fetchCities(provinceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId]);

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    setMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({
        interest_country: country || null,
        interest_region_id: regionId || null,
        interest_province_id: provinceId || null,
        interest_municipality_id: cityId || null,
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
            <option value="IT">Italia</option>
          </select>
        </label>

        <label className="label">
          Regione
          <select
            className="select"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            <option value="">Seleziona</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        <label className="label">
          Provincia
          <select
            className="select"
            disabled={!regionId}
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
          >
            <option value="">{regionId ? 'Seleziona' : '—'}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="label">
          Città
          <select
            className="select"
            disabled={!provinceId}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">{provinceId ? 'Seleziona' : '—'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <button onClick={save} disabled={saving} className="btn btn-brand">
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
