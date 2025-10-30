'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Club } from '@/types/club';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type Option = { value: string; label: string };

// estendiamo il tipo per evitare errori TS quando leggiamo i nuovi campi
type ClubGeo = {
  region_id?: number | null;
  province_id?: number | null;
  municipality_id?: number | null;
};

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClubForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Partial<Club> & ClubGeo;
  onCancel: () => void;
  onSaved: (saved: Club) => void;
}) {
  // base fields
  const [name, setName] = useState(initial?.name ?? '');
  const [displayName, setDisplayName] = useState(initial?.display_name ?? initial?.name ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [country, setCountry] = useState(initial?.country ?? 'IT');
  const [level, setLevel] = useState(initial?.level ?? 'amateur');
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '');

  // geo fields (string per i <select>)
  const [regionId, setRegionId] = useState<string>(
    initial?.region_id != null ? String(initial.region_id) : ''
  );
  const [provinceId, setProvinceId] = useState<string>(
    initial?.province_id != null ? String(initial.province_id) : ''
  );
  const [municipalityId, setMunicipalityId] = useState<string>(
    initial?.municipality_id != null ? String(initial.municipality_id) : ''
  );

  // options
  const [regions, setRegions] = useState<Option[]>([]);
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEdit = Boolean(initial?.id);

  // load regions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
      if (!cancelled) {
        setRegions((data ?? []).map((r: any) => ({ value: String(r.id), label: String(r.name) })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // when region changes → load provinces for that region
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!regionId) {
        setProvinces([]);
        setProvinceId('');
        setMunicipalities([]);
        setMunicipalityId('');
        return;
      }
      const { data } = await supabase
        .from('provinces')
        .select('id,name,region_id')
        .eq('region_id', Number(regionId))
        .order('name', { ascending: true });
      if (!cancelled) {
        const opts = (data ?? []).map((p: any) => ({ value: String(p.id), label: String(p.name) }));
        setProvinces(opts);
        // se la provincia selezionata non appartiene più alla regione scelta → reset
        if (!opts.find((o) => o.value === provinceId)) {
          setProvinceId('');
          setMunicipalityId('');
          setMunicipalities([]);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  // when province changes → load municipalities for that province
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!provinceId) {
        setMunicipalities([]);
        setMunicipalityId('');
        return;
      }
      const { data } = await supabase
        .from('municipalities')
        .select('id,name,province_id')
        .eq('province_id', Number(provinceId))
        .order('name', { ascending: true });
      if (!cancelled) {
        const opts = (data ?? []).map((m: any) => ({ value: String(m.id), label: String(m.name) }));
        setMunicipalities(opts);
        if (!opts.find((o) => o.value === municipalityId)) {
          setMunicipalityId('');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId]);

  // Se entriamo in edit con region/province valorizzate, carichiamo le catene coerenti
  useEffect(() => {
    // Solo prima render
    if (!isEdit) return;
    // se ho regionId già settata, i due effetti sopra faranno il resto
    // nulla da fare qui oltre a quanto già impostato in state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo(() => {
    const toNum = (v: string) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
    return {
      name: name.trim(),
      display_name: (displayName || name).trim(),
      city: city.trim() || null,
      country: (country || '').trim() || null,
      level: (level || '').trim() || null,
      logo_url: logoUrl.trim() || null,
      region_id: toNum(regionId),
      province_id: toNum(provinceId),
      municipality_id: toNum(municipalityId),
    };
  }, [name, displayName, city, country, level, logoUrl, regionId, provinceId, municipalityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/clubs/${initial!.id}` : '/api/clubs', {
        method: isEdit ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      onSaved(json.data);
    } catch (e: any) {
      setErr(e.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Display name</label>
        <input className="w-full rounded-xl border px-3 py-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input className="w-full rounded-xl border px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <input className="w-full rounded-xl border px-3 py-2" value={country ?? ''} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Level (Sport)</label>
          <select className="w-full rounded-xl border px-3 py-2" value={level ?? ''} onChange={(e) => setLevel(e.target.value as any)}>
            <option value="">(none)</option>
            <option value="pro">pro</option>
            <option value="semi-pro">semi-pro</option>
            <option value="amateur">amateur</option>
          </select>
        </div>
      </div>

      {/* Filtri/geo fields persistiti */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Regione</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            <option value="">(nessuna)</option>
            {regions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Provincia</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
            disabled={!regionId}
          >
            <option value="">{regionId ? '(seleziona provincia)' : '—'}</option>
            {provinces.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Comune</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={municipalityId}
            onChange={(e) => setMunicipalityId(e.target.value)}
            disabled={!provinceId}
          >
            <option value="">{provinceId ? '(seleziona comune)' : '—'}</option>
            {municipalities.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Logo URL</label>
        <input className="w-full rounded-xl border px-3 py-2" value={logoUrl ?? ''} onChange={(e) => setLogoUrl(e.target.value)} />
      </div>

      {err && <div className="border rounded-lg p-2 bg-red-50 text-red-700">{err}</div>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" disabled={saving} onClick={onCancel} className="px-3 py-2 rounded-lg border hover:bg-gray-50">
          Annulla
        </button>
        <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-gray-900 text-white">
          {saving ? 'Salvataggio…' : isEdit ? 'Salva' : 'Crea'}
        </button>
      </div>
    </form>
  );
}
