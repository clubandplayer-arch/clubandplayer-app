'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Opportunity } from '@/types/opportunity';
import { AGE_BRACKETS, type AgeBracket, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { COUNTRIES } from '@/lib/opps/geo';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Gender = 'male' | 'female' | 'mixed';

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Maschile' },
  { value: 'female', label: 'Femminile' },
  { value: 'mixed', label: 'Misto' },
];

type RegionRow = { id: number; name: string };
type ProvinceRow = { id: number; name: string; region_id: number };
type MunicipalityRow = { id: number; name: string; province_id: number };

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('it');
}

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
  gender?: Gender | null;
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

  // Località
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [countryCode, setCountryCode] = useState<string>(
    COUNTRIES.find((c) => c.label === initial?.country)?.code ?? 'IT'
  );
  const [countryFree, setCountryFree] = useState<string>(
    initial?.country && !COUNTRIES.find((c) => c.label === initial.country) ? initial.country : ''
  );
  const [regionLabel, setRegionLabel] = useState<string>(initial?.region ?? '');
  const [provinceLabel, setProvinceLabel] = useState<string>(initial?.province ?? '');
  const [cityLabel, setCityLabel] = useState<string>(initial?.city ?? '');

  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);

  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityRow[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  const filteredMunicipalities = useMemo(() => {
    const q = cityFilter.trim().toLocaleLowerCase('it');
    if (!q) return municipalities;
    const filtered = municipalities.filter((m) =>
      m.name.toLocaleLowerCase('it').includes(q)
    );
    if (
      municipalityId != null &&
      !filtered.some((m) => m.id === municipalityId)
    ) {
      const selected = municipalities.find((m) => m.id === municipalityId);
      if (selected) filtered.unshift(selected);
    }
    return filtered;
  }, [municipalities, cityFilter, municipalityId]);

  const initialRegionName = initial?.region ?? null;
  const initialProvinceName = initial?.province ?? null;
  const initialCityName = initial?.city ?? null;

  const initialRegionApplied = useRef(false);
  const initialProvinceApplied = useRef(false);
  const initialCityApplied = useRef(false);

  useEffect(() => {
    if (countryCode !== 'IT') {
      setRegions([]);
      setRegionId(null);
      setLoadingRegions(false);
      return;
    }

    let ignore = false;
    setLoadingRegions(true);
    supabase
      .from('regions')
      .select('id,name')
      .order('name')
      .then(({ data, error }) => {
        if (ignore) return;
        if (!error && data) {
          setRegions(data);
        } else {
          setRegions([]);
        }
        setLoadingRegions(false);
      });

    return () => {
      ignore = true;
    };
  }, [supabase, countryCode]);

  useEffect(() => {
    if (countryCode !== 'IT') return;
    if (!regions.length) return;
    if (initialRegionApplied.current) return;

    if (initialRegionName) {
      const match = regions.find((r) => normalize(r.name) === normalize(initialRegionName));
      if (match) {
        setRegionId(match.id);
        setRegionLabel(match.name);
      }
    }

    initialRegionApplied.current = true;
  }, [regions, countryCode, initialRegionName]);

  useEffect(() => {
    if (countryCode !== 'IT') {
      setProvinces([]);
      setProvinceId(null);
      setMunicipalities([]);
      setMunicipalityId(null);
      setLoadingProvinces(false);
      setLoadingCities(false);
      return;
    }

    if (!regionId) {
      setProvinces([]);
      setProvinceId(null);
      setMunicipalities([]);
      setMunicipalityId(null);
      setLoadingProvinces(false);
      setLoadingCities(false);
      return;
    }

    let ignore = false;
    setLoadingProvinces(true);
    supabase
      .from('provinces')
      .select('id,name,region_id')
      .eq('region_id', regionId)
      .order('name')
      .then(({ data, error }) => {
        if (ignore) return;
        if (!error && data) {
          setProvinces(data);
        } else {
          setProvinces([]);
        }
        setLoadingProvinces(false);
      });

    return () => {
      ignore = true;
    };
  }, [supabase, countryCode, regionId]);

  useEffect(() => {
    if (countryCode !== 'IT') return;
    if (!provinces.length) return;
    if (initialProvinceApplied.current) return;

    if (initialProvinceName) {
      const match = provinces.find((p) => normalize(p.name) === normalize(initialProvinceName));
      if (match) {
        setProvinceId(match.id);
        setProvinceLabel(match.name);
      }
    }

    initialProvinceApplied.current = true;
  }, [provinces, countryCode, initialProvinceName]);

  useEffect(() => {
    if (countryCode !== 'IT') {
      setMunicipalities([]);
      setMunicipalityId(null);
      setLoadingCities(false);
      return;
    }

    if (!provinceId) {
      setMunicipalities([]);
      setMunicipalityId(null);
      setLoadingCities(false);
      return;
    }

    let ignore = false;
    setLoadingCities(true);
    supabase
      .from('municipalities')
      .select('id,name,province_id')
      .eq('province_id', provinceId)
      .order('name')
      .then(({ data, error }) => {
        if (ignore) return;
        if (!error && data) {
          setMunicipalities(data);
        } else {
          setMunicipalities([]);
        }
        setLoadingCities(false);
      });

    return () => {
      ignore = true;
    };
  }, [supabase, countryCode, provinceId]);

  useEffect(() => {
    if (countryCode !== 'IT') return;
    if (!municipalities.length) return;
    if (initialCityApplied.current) return;

    if (initialCityName) {
      const match = municipalities.find((m) => normalize(m.name) === normalize(initialCityName));
      if (match) {
        setMunicipalityId(match.id);
        setCityLabel(match.name);
      }
    }

    initialCityApplied.current = true;
  }, [municipalities, countryCode, initialCityName]);

  useEffect(() => {
    setCityFilter('');
  }, [provinceId, countryCode]);

  // Sport/ruolo
  const [sport, setSport] = useState<string>(initial?.sport || 'Calcio');
  const roleOptions = useMemo(() => SPORTS_ROLES[sport] ?? [], [sport]);
  const [role, setRole] = useState<string>(initial?.role ?? '');

  // Genere (OBBLIGATORIO)
  const [gender, setGender] = useState<Gender | ''>((initial?.gender as Gender) ?? '');

  // Età (mappa ⇄ age_min/age_max)
  const [ageBracket, setAgeBracket] = useState<AgeBracket | ''>(() =>
    bracketFromRange(initial?.age_min ?? null, initial?.age_max ?? null)
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  function effectiveCountry(): string | null {
    if (countryCode === 'OTHER') return countryFree.trim() || null;
    const found = COUNTRIES.find((c) => c.code === countryCode);
    return found?.label ?? countryCode ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const t = title.trim();
    if (!t) return setErr('Titolo obbligatorio');
    if (sport === 'Calcio' && !role) return setErr('Seleziona un ruolo per Calcio');
    if (!gender) return setErr('Seleziona il genere');

    const { age_min, age_max } = rangeFromBracket(ageBracket);

    setSaving(true);
    try {
      const resolvedRegion =
        countryCode === 'IT'
          ? regionId != null
            ? regions.find((r) => r.id === regionId)?.name ?? (regionLabel.trim() || null)
            : regionLabel.trim() || null
          : regionLabel.trim() || null;

      const resolvedProvince =
        countryCode === 'IT'
          ? provinceId != null
            ? provinces.find((p) => p.id === provinceId)?.name ?? (provinceLabel.trim() || null)
            : provinceLabel.trim() || null
          : provinceLabel.trim() || null;

      const resolvedCity =
        countryCode === 'IT'
          ? municipalityId != null
            ? municipalities.find((m) => m.id === municipalityId)?.name ?? (cityLabel.trim() || null)
            : cityLabel.trim() || null
          : cityLabel.trim() || null;

      const payload = {
        title: t,
        description: (description || '').trim() || null,
        country: effectiveCountry(),
        region: resolvedRegion,
        province: resolvedProvince,
        city: resolvedCity,
        sport,
        role: role || null,
        gender: gender as Gender,
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
    setRegionLabel('');
    setProvinceLabel('');
    setCityLabel('');
    setRegionId(null);
    setProvinceId(null);
    setMunicipalityId(null);
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
              {COUNTRIES.map((c) => (
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
                value={regionId ?? ''}
                onChange={(e) => {
                  const rid = e.target.value ? Number(e.target.value) : null;
                  setRegionId(rid);
                  const label = rid ? regions.find((r) => r.id === rid)?.name ?? '' : '';
                  setRegionLabel(label);
                  setProvinceId(null);
                  setProvinceLabel('');
                  setMunicipalityId(null);
                  setCityLabel('');
                }}
                disabled={loadingRegions && regions.length === 0}
              >
                <option value="">{loadingRegions ? 'Caricamento…' : '—'}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={regionLabel}
                onChange={(e) => setRegionLabel(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Provincia</label>
            {countryCode === 'IT' ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={provinceId ?? ''}
                onChange={(e) => {
                  const pid = e.target.value ? Number(e.target.value) : null;
                  setProvinceId(pid);
                  const label = pid ? provinces.find((p) => p.id === pid)?.name ?? '' : '';
                  setProvinceLabel(label);
                  setMunicipalityId(null);
                  setCityLabel('');
                }}
                disabled={!regionId || loadingProvinces}
              >
                <option value="">
                  {!regionId ? 'Seleziona la regione…' : loadingProvinces ? 'Caricamento…' : '—'}
                </option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={provinceLabel}
                onChange={(e) => setProvinceLabel(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Città</label>
            {countryCode === 'IT' ? (
              <>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder={provinceId ? 'Filtra i comuni…' : 'Seleziona prima la provincia'}
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  disabled={!provinceId}
                />
                <select
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  value={municipalityId ?? ''}
                  onChange={(e) => {
                    const mid = e.target.value ? Number(e.target.value) : null;
                    setMunicipalityId(mid);
                    const label = mid
                      ? municipalities.find((m) => m.id === mid)?.name ?? ''
                      : '';
                    setCityLabel(label);
                  }}
                  disabled={!provinceId || loadingCities}
                >
                  <option value="">
                    {!provinceId
                      ? 'Seleziona la provincia…'
                      : loadingCities
                        ? 'Caricamento…'
                        : filteredMunicipalities.length
                          ? '—'
                          : 'Nessun risultato'}
                  </option>
                  {filteredMunicipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={cityLabel}
                onChange={(e) => setCityLabel(e.target.value)}
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
              onChange={(e) => setGender(e.target.value as Gender)}
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
