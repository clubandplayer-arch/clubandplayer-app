'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Id = number | null;

export type LocationValue = {
  region_id: Id;
  province_id: Id;
  municipality_id: Id;
};

type Region = { id: number; name: string };
type Province = { id: number; name: string; region_id: number };
type Municipality = { id: number; name: string; province_id: number; region_id: number };

type Props = {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  labels?: {
    region?: string;
    province?: string;
    municipality?: string;
  };
};

export default function LocationPicker({
  value,
  onChange,
  disabled,
  required,
  className,
  labels,
}: Props) {
  const supabase = supabaseBrowser();

  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);

  // load all regions once
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('regions').select('id,name').order('name');
      setRegions(data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load provinces when region changes
  useEffect(() => {
    (async () => {
      if (!value.region_id) {
        setProvinces([]);
        setMunicipalities([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('provinces')
        .select('id,name,region_id')
        .eq('region_id', value.region_id)
        .order('name');
      setProvinces(data ?? []);
      setMunicipalities([]); // reset
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.region_id]);

  // load municipalities when province changes
  useEffect(() => {
    (async () => {
      if (!value.province_id) {
        setMunicipalities([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('municipalities')
        .select('id,name,province_id,region_id')
        .eq('province_id', value.province_id)
        .order('name');
      setMunicipalities(data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.province_id]);

  const regionName = useMemo(
    () => regions.find(r => r.id === value.region_id)?.name ?? '',
    [regions, value.region_id]
  );
  const provinceName = useMemo(
    () => provinces.find(p => p.id === value.province_id)?.name ?? '',
    [provinces, value.province_id]
  );

  return (
    <div className={className}>
      {/* Regione */}
      <label className="label">
        {labels?.region ?? 'Regione'}
        <select
          className="select"
          value={value.region_id ?? ''}
          disabled={disabled}
          required={required}
          onChange={(e) => {
            const rid = e.target.value ? Number(e.target.value) : null;
            onChange({ region_id: rid, province_id: null, municipality_id: null });
          }}
        >
          <option value="">{loading ? 'Caricamento…' : 'Seleziona…'}</option>
          {regions.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>

      {/* Provincia */}
      <label className="label mt-2 block">
        {labels?.province ?? (regionName ? `Provincia (${regionName})` : 'Provincia')}
        <select
          className="select"
          value={value.province_id ?? ''}
          disabled={disabled || !value.region_id}
          required={required}
          onChange={(e) => {
            const pid = e.target.value ? Number(e.target.value) : null;
            onChange({ ...value, province_id: pid, municipality_id: null });
          }}
        >
          <option value="">{!value.region_id ? 'Seleziona la regione…' : (loading ? 'Caricamento…' : 'Seleziona…')}</option>
          {provinces.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      {/* Comune */}
      <label className="label mt-2 block">
        {labels?.municipality ?? (provinceName ? `Comune (${provinceName})` : 'Comune')}
        <select
          className="select"
          value={value.municipality_id ?? ''}
          disabled={disabled || !value.province_id}
          required={required}
          onChange={(e) => {
            const mid = e.target.value ? Number(e.target.value) : null;
            onChange({ ...value, municipality_id: mid });
          }}
        >
          <option value="">{!value.province_id ? 'Seleziona la provincia…' : (loading ? 'Caricamento…' : 'Seleziona…')}</option>
          {municipalities.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
