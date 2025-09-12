'use client';

import { useState } from 'react';
import { COUNTRIES, ITALY_REGIONS, PROVINCES_BY_REGION, CITIES_BY_PROVINCE } from '@/lib/opps/geo';
import { AGE_BRACKETS, SPORTS } from '@/lib/opps/constants';
import type { Opportunity, Gender } from '@/types/opportunity';

type Props = {
  initial?: Opportunity | null;
  onCancel?: () => void;
  onSaved?: () => void;
};

const GENDERS: Gender[] = ['uomo', 'donna', 'mixed'];

export default function OpportunityForm({ initial, onCancel, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const [country, setCountry] = useState(initial?.country ?? 'Italia');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [province, setProvince] = useState(initial?.province ?? '');
  const [city, setCity] = useState(initial?.city ?? '');

  const [sport, setSport] = useState(initial?.sport ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [age, setAge] = useState(initial?.age ?? '');

  // nuovo: Genere (obbligatorio)
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'mixed');

  function resetCascade(nextRegion = '', nextProvince = '', nextCity = '') {
    setRegion(nextRegion);
    setProvince(nextProvince);
    setCity(nextCity);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Titolo obbligatorio');
      return;
    }
    if (!role) {
      alert('Ruolo obbligatorio');
      return;
    }
    if (!gender) {
      alert('Genere obbligatorio');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        country: country || null,
        region: region || null,
        province: province || null,
        city: city || null,
        sport: sport || null,
        role: role || null,
        age: age || null,
        gender, // <— nuovo campo richiesto
      };

      const url = initial ? `/api/opportunities/${initial.id}` : '/api/opportunities';
      const method = initial ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const txt = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(txt); throw new Error(j.error || `HTTP ${res.status}`); }
        catch { throw new Error(txt || `HTTP ${res.status}`); }
      }

      onSaved?.();
    } catch (err: any) {
      alert(err?.message || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titolo & Descrizione */}
      <div>
        <label className="block text-sm font-medium mb-1">Titolo *</label>
        <input
          className="w-full rounded-xl border px-4 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titolo"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrizione</label>
        <textarea
          className="w-full rounded-xl border px-4 py-2 min-h-[110px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrivi l'opportunità…"
        />
      </div>

      {/* Località */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Paese</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={country ?? ''}
            onChange={(e) => {
              setCountry(e.target.value);
              resetCascade('', '', '');
            }}
          >
            <option value="">—</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Regione</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setProvince('');
              setCity('');
            }}
            disabled={country !== 'Italia'}
          >
            <option value="">—</option>
            {ITALY_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Provincia</label>
          {country === 'Italia' && PROVINCES_BY_REGION[region] ? (
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={province}
              onChange={(e) => { setProvince(e.target.value); setCity(''); }}
            >
              <option value="">—</option>
              {PROVINCES_BY_REGION[region]?.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="Provincia"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Città</label>
          {country === 'Italia' && CITIES_BY_PROVINCE[province] ? (
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">—</option>
              {CITIES_BY_PROVINCE[province]?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Città"
            />
          )}
        </div>
      </div>

      {/* Sport & Profilo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Sport</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            <option value="">—</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ruolo *</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ruolo richiesto"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Età</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">—</option>
            {AGE_BRACKETS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* NUOVO: Genere (obbligatorio) */}
        <div>
          <label className="block text-sm font-medium mb-1">Genere *</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            required
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g === 'uomo' ? 'Uomo' : g === 'donna' ? 'Donna' : 'Mixed'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Azioni */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border"
          onClick={onCancel}
          disabled={saving}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50"
          disabled={saving}
        >
          {initial ? 'Salva' : 'Crea'}
        </button>
      </div>
    </form>
  );
}
