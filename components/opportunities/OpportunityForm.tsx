'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Opportunity } from '@/types/opportunity';
import { AGE_BRACKETS, type AgeBracket, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { COUNTRIES } from '@/lib/opps/geo';
import {
  OPPORTUNITY_GENDER_LABELS,
  normalizeOpportunityGender,
  type OpportunityGenderCode,
} from '@/lib/opps/gender';

type LocationLevel = 'region' | 'province' | 'municipality';
type LocationRow = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function fetchLocationChildren(level: LocationLevel, parent: number | null): Promise<LocationRow[]> {
  try {
    const { data, error } = await supabase.rpc('location_children', { level, parent });
    if (!error && Array.isArray(data)) {
      return (data as LocationRow[]).map((row) => ({ id: Number(row.id), name: row.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'accent' }));
    }
  } catch (err) {
    console.warn('location_children rpc failed', err);
  }

  if (level === 'region') {
    const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
    return (data ?? []).map((row: any) => ({ id: Number(row.id), name: row.name as string }));
  }

  if (level === 'province') {
    if (parent == null) return [];
    const { data } = await supabase
      .from('provinces')
      .select('id,name')
      .eq('region_id', parent)
      .order('name', { ascending: true });
    return (data ?? []).map((row: any) => ({ id: Number(row.id), name: row.name as string }));
  }

  if (parent == null) return [];
  const { data } = await supabase
    .from('municipalities')
    .select('id,name')
    .eq('province_id', parent)
    .order('name', { ascending: true });
  return (data ?? []).map((row: any) => ({ id: Number(row.id), name: row.name as string }));
}

const GENDERS = (Object.entries(OPPORTUNITY_GENDER_LABELS) as Array<[
  OpportunityGenderCode,
  string,
]>).map(([value, label]) => ({ value, label }));

function rangeFromBracket(b: AgeBracket | '' | undefined): { age_min: number | null; age_max: number | null } {
  if (!b) return { age_min: null, age_max: null };
  if (b.endsWith('+')) {
    const n = parseInt(b.replace('+', ''), 10);
    return Number.isFinite(n) ? { age_min: n, age_max: null } : { age_min: null, age_max: null };
  }
  if (b.startsWith('≤')) {
    const n = parseInt(b.replace('≤', ''), 10);
    return Number.isFinite(n) ? { age_min: null, age_max: n } : { age_min: null, age_max: null };
  }
  const m = b.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const min = parseInt(m[1], 10);
    const max = parseInt(m[2], 10);
    if (Number.isFinite(min) && Number.isFinite(max)) return { age_min: min, age_max: max };
  }
  return { age_min: null, age_max: null };
}

function bracketFromRange(min?: number | null, max?: number | null): AgeBracket | '' {
  if (min != null && max != null) return `${min}-${max}` as AgeBracket;
  if (min != null && max == null) return `${min}+` as AgeBracket;
  if (min == null && max != null) return (`≤${max}` as unknown) as AgeBracket;
  return '';
}

// Estendiamo il tipo SOLO per il prop initial, senza toccare i tipi globali
type OpportunityInitial = Partial<Opportunity> & {
  gender?: string | null;
};

export default function OpportunityForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: OpportunityInitial;
  onCancel: () => void;
  onSaved: (saved: Opportunity) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const availableCountries = COUNTRIES;

  // Località
  const [countryCode, setCountryCode] = useState<string>(
    availableCountries.find((c) => c.label === initial?.country)?.code ?? 'IT'
  );
  const [countryFree, setCountryFree] = useState<string>(
    initial?.country && !availableCountries.find((c) => c.label === initial.country) ? initial.country : ''
  );
  const [region, setRegion] = useState<string>(initial?.region ?? '');
  const [province, setProvince] = useState<string>(initial?.province ?? '');
  const [city, setCity] = useState<string>(initial?.city ?? '');
  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const regionsLoadedRef = useRef(false);
  const provincesLoadedRef = useRef(false);
  const citiesLoadedRef = useRef(false);

  // Sport/ruolo
  const [sport, setSport] = useState<string>(initial?.sport || 'Calcio');
  const roleOptions = useMemo(() => SPORTS_ROLES[sport] ?? [], [sport]);
  const [role, setRole] = useState<string>(initial?.role ?? '');

  // Genere (OBBLIGATORIO)
  const [gender, setGender] = useState<OpportunityGenderCode | ''>(
    () => normalizeOpportunityGender(initial?.gender) ?? ''
  );

  // Età (mappa ⇄ age_min/age_max)
  const [ageBracket, setAgeBracket] = useState<AgeBracket | ''>(() =>
    bracketFromRange(initial?.age_min ?? null, initial?.age_max ?? null)
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    regionsLoadedRef.current = false;
    if (countryCode !== 'IT') {
      setRegions([]);
      setRegionId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const rows = await fetchLocationChildren('region', null);
      if (cancelled) return;
      setRegions(rows);
      regionsLoadedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    if (countryCode !== 'IT') {
      setRegionId(null);
      return;
    }
    if (!regionsLoadedRef.current) return;
    const match = regions.find((r) => r.name === region);
    if (!match && region) {
      setRegion('');
      setRegionId(null);
      setProvince('');
      setProvinceId(null);
      setCity('');
      setCities([]);
      return;
    }
    setRegionId(match?.id ?? null);
  }, [countryCode, region, regions]);

  useEffect(() => {
    provincesLoadedRef.current = false;
    if (countryCode !== 'IT' || regionId == null) {
      setProvinces([]);
      setProvinceId(null);
      setCities([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const rows = await fetchLocationChildren('province', regionId);
      if (cancelled) return;
      setProvinces(rows);
      provincesLoadedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode, regionId]);

  useEffect(() => {
    if (countryCode !== 'IT') {
      setProvinceId(null);
      return;
    }
    if (!provincesLoadedRef.current) return;
    const match = provinces.find((p) => p.name === province);
    if (!match && province) {
      setProvince('');
      setProvinceId(null);
      setCity('');
      setCities([]);
      return;
    }
    setProvinceId(match?.id ?? null);
  }, [countryCode, province, provinces]);

  useEffect(() => {
    citiesLoadedRef.current = false;
    if (countryCode !== 'IT' || provinceId == null) {
      setCities([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const rows = await fetchLocationChildren('municipality', provinceId);
      if (cancelled) return;
      const names = rows.map((row) => row.name).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'accent' }));
      setCities(names);
      citiesLoadedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode, provinceId]);

  useEffect(() => {
    if (countryCode !== 'IT') return;
    if (!citiesLoadedRef.current) return;
    if (city && !cities.includes(city)) {
      setCity('');
    }
  }, [countryCode, city, cities]);

  function effectiveCountry(): string | null {
    if (countryCode === 'OTHER') return countryFree.trim() || null;
    const found = availableCountries.find((c) => c.code === countryCode);
    return found?.label ?? countryCode ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const t = title.trim();
    if (!t) return setErr('Titolo obbligatorio');
    if (sport === 'Calcio' && !role) return setErr('Seleziona un ruolo per Calcio');
    const normalizedGender = normalizeOpportunityGender(gender);
    if (!normalizedGender) return setErr('Seleziona il genere');

    const { age_min, age_max } = rangeFromBracket(ageBracket);

    setSaving(true);
    try {
      const payload = {
        title: t,
        description: (description || '').trim() || null,
        country: effectiveCountry(),
        region: region || null,
        province: countryCode === 'IT' ? province || null : null,
        city: (city || '').trim() || null,
        sport,
        role: role || null,
        gender: normalizedGender,
        age_bracket: ageBracket || undefined,
        age_min,
        age_max,
      };

      const res = await fetch(isEdit ? `/api/opportunities/${initial!.id}` : '/api/opportunities', {
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

  // reset coerente dei campi a cascata
  function onChangeCountry(code: string) {
    setCountryCode(code);
    setCountryFree('');
    if (code !== 'IT') {
      setRegion('');
      setRegionId(null);
      setProvince('');
      setProvinceId(null);
      setCity('');
      setCities([]);
    }
  }
  function onChangeRegion(r: string) {
    setRegion(r);
    const match = regions.find((row) => row.name === r);
    setRegionId(match?.id ?? null);
    setProvince('');
    setProvinceId(null);
    setCity('');
    setCities([]);
  }
  function onChangeProvince(p: string) {
    setProvince(p);
    const match = provinces.find((row) => row.name === p);
    setProvinceId(match?.id ?? null);
    setCity('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Titolo *</label>
        <input
          className="w-full rounded-xl border px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrizione</label>
        <textarea
          className="w-full rounded-xl border px-3 py-2 min-h-28"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Località</legend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Paese</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={countryCode}
              onChange={(e) => onChangeCountry(e.target.value)}
            >
              {availableCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {countryCode === 'OTHER' && (
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2"
                placeholder="Paese"
                value={countryFree}
                onChange={(e) => setCountryFree(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Regione</label>
            {countryCode === 'IT' ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={region}
                onChange={(e) => onChangeRegion(e.target.value)}
              >
                <option value="">—</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={region ?? ''}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setRegionId(null);
                }}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Provincia</label>
            {countryCode === 'IT' && provinces.length > 0 ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={province}
                onChange={(e) => onChangeProvince(e.target.value)}
              >
                <option value="">—</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={province ?? ''}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setProvinceId(null);
                }}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Città</label>
            {countryCode === 'IT' && cities.length > 0 ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">—</option>
                {cities.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={city ?? ''}
                onChange={(e) => setCity(e.target.value)}
              />
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Sport & Profilo</legend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={sport}
              onChange={(e) => {
                setSport(e.target.value);
                setRole('');
              }}
            >
              {SPORTS.map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Ruolo {sport === 'Calcio' && <span className="text-red-600">*</span>}
            </label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={role ?? ''}
              onChange={(e) => setRole(e.target.value)}
              required={sport === 'Calcio'}
            >
              <option value="">—</option>
              {roleOptions.map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* GENERE obbligatorio */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Genere <span className="text-red-600">*</span>
            </label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={gender}
              onChange={(e) => {
                const next = (e.target.value || '') as OpportunityGenderCode | '';
                setGender(next);
              }}
              required
            >
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Età</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={ageBracket}
              onChange={(e) => setAgeBracket(e.target.value as AgeBracket)}
            >
              <option value="">—</option>
              {AGE_BRACKETS.map((b: string) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {err && <div className="border rounded-lg p-2 bg-red-50 text-red-700">{err}</div>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white"
        >
          {saving ? 'Salvataggio…' : isEdit ? 'Salva' : 'Crea'}
        </button>
      </div>
    </form>
  );
}

