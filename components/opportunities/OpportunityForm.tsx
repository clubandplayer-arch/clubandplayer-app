'use client';

import { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, ITALY_REGIONS, PROVINCES_BY_REGION, CITIES_BY_PROVINCE } from '@/lib/opps/geo';
import { AGE_BRACKETS, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import type { Opportunity, Gender } from '@/types/opportunity';

type Props = {
  initial?: Opportunity | null;
  onCancel: () => void;
  onSaved: () => void;
};

export default function OpportunityForm({ initial, onCancel, onSaved }: Props) {
  // Base
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  // Località
  const [country, setCountry] = useState(initial?.country ?? 'Italia');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [province, setProvince] = useState(initial?.province ?? '');
  const [city, setCity] = useState(initial?.city ?? '');

  // Sport & profilo
  const [sport, setSport] = useState(initial?.sport ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [age, setAge] = useState(initial?.age ?? '');
  const [gender, setGender] = useState<Gender>((initial?.gender as Gender) ?? 'mixed');

  // Ruoli disponibili per lo sport selezionato
  const availableRoles = useMemo<string[]>(
    () => (sport ? (SPORTS_ROLES?.[sport] ?? []) : []),
    [sport]
  );

  // Se cambio sport e il ruolo corrente non è più valido → reset
  useEffect(() => {
    if (!availableRoles.includes(role)) {
      setRole('');
    }
  }, [availableRoles, role]);

  // Gestione cascata Italia
  useEffect(() => {
    if (country !== 'Italia') {
      setRegion('');
      setProvince('');
      setCity('');
    }
  }, [country]);

  useEffect(() => {
    setProvince('');
    setCity('');
  }, [region]);

  useEffect(() => {
    setCity('');
  }, [province]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      alert('Il titolo è obbligatorio');
      return;
    }
    if (!sport) {
      alert('Seleziona lo sport');
      return;
    }
    if (availableRoles.length > 0 && !role) {
      alert('Seleziona il ruolo richiesto');
      return;
    }
    if (!age) {
      alert('Seleziona la fascia di età');
      return;
    }
    if (!gender) {
      alert('Seleziona il genere');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      country: country || null,
      region: region || null,
      province: province || null,
      city: city || null,
      sport,
      role: role || null,
      age,
      gender,
    };

    const isEdit = !!initial?.id;
    const url = isEdit ? `/api/opportunities/${initial!.id}` : '/api/opportunities';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(txt);
        throw new Error(j.error || `HTTP ${res.status}`);
      } catch {
        throw new Error(txt || `HTTP ${res.status}`);
      }
    }
    onSaved();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Titolo */}
      <div>
        <label className="block text-sm font-medium mb-1">Titolo *</label>
        <input
          className="w-full rounded-xl border px-4 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Cercasi centrocampista…"
        />
      </div>

      {/* Descrizione */}
      <div>
        <label className="block text-sm font-medium mb-1">Descrizione</label>
        <textarea
          className="w-full rounded-xl border px-4 py-2 h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dettagli dell'opportunità…"
        />
      </div>

      {/* Località */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Paese</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Regione</label>
          {country === 'Italia' ? (
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">—</option>
              {ITALY_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Regione"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Provincia</label>
          {country === 'Italia' && PROVINCES_BY_REGION[region] ? (
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">—</option>
              {PROVINCES_BY_REGION[region]?.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
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
                <option key={c} value={c}>
                  {c}
                </option>
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ruolo *</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!sport || availableRoles.length === 0}
          >
            <option value="">{sport ? 'Seleziona ruolo' : 'Seleziona sport'}</option>
            {availableRoles.map((r) => (
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
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">—</option>
            {AGE_BRACKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Genere *</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value="male">Uomo</option>
            <option value="female">Donna</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      {/* Azioni */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
        >
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90"
        >
          {initial?.id ? 'Salva' : 'Crea'}
        </button>
      </div>
    </form>
  );
}
