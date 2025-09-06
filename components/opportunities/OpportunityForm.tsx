'use client';

import { useMemo, useState } from 'react';
import type { Opportunity } from '@/types/opportunity';
import { COUNTRIES, ITALY_REGIONS, SPORTS, SPORTS_ROLES, AGE_BRACKETS, AgeBracket } from '@/lib/opps/constants';

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

  // Geo
  const [countryCode, setCountryCode] = useState<string>(initial?.country || 'IT');
  const [countryFree, setCountryFree] = useState<string>(initial?.country && !COUNTRIES.find(c => c.code === initial.country) ? initial.country : '');
  const [region, setRegion] = useState<string>(initial?.region ?? '');
  const [city, setCity] = useState<string>(initial?.city ?? '');

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

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  function effectiveCountry(): string | null {
    if (countryCode === 'OTHER') return countryFree.trim() || null;
    const found = COUNTRIES.find(c => c.code === countryCode);
    return found?.label ?? countryCode ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const t = title.trim();
    if (!t) { setErr('Title is required'); return; }

    setSaving(true);
    try {
      const payload = {
        title: t,
        description: (description || '').trim() || null,
        country: effectiveCountry(),
        region: (countryCode === 'IT' ? region : region || null) || null,
        city: city.trim() || null,
        sport,
        role: role || null,
        age_bracket: ageBracket || undefined,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titolo / Descrizione */}
      <div>
        <label className="block text-sm font-medium mb-1">Titolo *</label>
        <input className="w-full rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrizione</label>
        <textarea className="w-full rounded-xl border px-3 py-2 min-h-28" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {/* Localizzazione */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Località</legend>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Paese</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={COUNTRIES.find(c => c.label === initial?.country)?.code ?? countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
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
              <select className="w-full rounded-xl border px-3 py-2" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">—</option>
                {ITALY_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input className="w-full rounded-xl border px-3 py-2" value={region ?? ''} onChange={(e) => setRegion(e.target.value)} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Città</label>
            <input className="w-full rounded-xl border px-3 py-2" value={city ?? ''} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Sport / Ruolo / Età */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Sport & Profilo</legend>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select className="w-full rounded-xl border px-3 py-2" value={sport} onChange={(e) => { setSport(e.target.value); setRole(''); }}>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ruolo</label>
            <select className="w-full rounded-xl border px-3 py-2" value={role ?? ''} onChange={(e) => setRole(e.target.value)}>
              <option value="">—</option>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Età</label>
            <select className="w-full rounded-xl border px-3 py-2" value={ageBracket} onChange={(e) => setAgeBracket(e.target.value as any)}>
              <option value="">—</option>
              {AGE_BRACKETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

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
