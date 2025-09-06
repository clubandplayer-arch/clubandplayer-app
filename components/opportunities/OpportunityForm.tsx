'use client';

import { useMemo, useState } from 'react';
import type { Opportunity } from '@/types/opportunity';
import { AGE_BRACKETS, AgeBracket, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { COUNTRIES, ITALY_REGIONS, PROVINCES_BY_REGION, CITIES_BY_PROVINCE } from '@/lib/opps/geo';

export default function OpportunityForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Partial<Opportunity>;
  onCancel: () => void;
  onSaved: (saved: Opportunity) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  // Località (statiche: Regioni/Province da costanti; Comuni per Siracusa e Roma, altrimenti input libero)
  const [countryCode, setCountryCode] = useState<string>(
    COUNTRIES.find((c) => c.label === initial?.country)?.code ?? 'IT'
  );
  const [countryFree, setCountryFree] = useState<string>(
    initial?.country && !COUNTRIES.find((c) => c.label === initial.country) ? initial.country : ''
  );
  const [region, setRegion] = useState<string>(initial?.region ?? '');
  const [province, setProvince] = useState<string>(initial?.province ?? '');
  const [city, setCity] = useState<string>(initial?.city ?? '');

  const provinces: string[] = useMemo(
    () => (countryCode === 'IT' ? PROVINCES_BY_REGION[region] ?? [] : []),
    [countryCode, region]
  );
  const cities: string[] = useMemo(
    () => (countryCode === 'IT' ? CITIES_BY_PROVINCE[province] ?? [] : []),
    [countryCode, province]
  );

  // Sport/ruolo
  const [sport, setSport] = useState<string>(initial?.sport || 'Calcio');
  const roleOptions = useMemo(() => SPORTS_ROLES[sport] ?? [], [sport]);
  const [role, setRole] = useState<string>(initial?.role ?? '');

  // Età
  const [ageBracket, setAgeBracket] = useState<AgeBracket | ''>(() => {
    if (initial?.age_min != null) {
      const { age_min, age_max } = initial;
      if (age_min === 17 && age_max === 20) return '17-20';
      if (age_min === 21 && age_max === 25) return '21-25';
      if (age_min === 26 && age_max === 30) return '26-30';
      if (age_min === 31 && age_max == null) return '31+';
    }
    return '';
  });

  // Club (opzionale)
  const [clubName, setClubName] = useState(initial?.club_name ?? '');

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
    if (!t) {
      setErr('Title is required');
      return;
    }
    if (sport === 'Calcio' && !role) {
      setErr('Seleziona un ruolo per Calcio');
      return;
    }

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
        age_bracket: ageBracket || undefined,
        club_name: (clubName || '').trim() || null,
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
      setProvince('');
      setCity('');
    }
  }
  function onChangeRegion(r: string) {
    setRegion(r);
    setProvince('');
    setCity('');
  }
  function onChangeProvince(p: string) {
    setProvince(p);
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
                value={region}
                onChange={(e) => onChangeRegion(e.target.value)}
              >
                <option value="">—</option>
                {ITALY_REGIONS.map((r: string) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={region ?? ''}
                onChange={(e) => setRegion(e.target.value)}
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
                {provinces.map((p: string) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={province ?? ''}
                onChange={(e) => setProvince(e.target.value)}
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
          <div>
            <label className="block text-sm font-medium mb-1">Club (opzionale)</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={clubName ?? ''}
              onChange={(e) => setClubName(e.target.value)}
            />
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
