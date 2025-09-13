'use client';

import { useEffect, useMemo, useState } from 'react';
import { SPORTS } from '@/lib/opps/constants';
import { COUNTRIES, ITALY_REGIONS, PROVINCES_BY_REGION, CITIES_BY_PROVINCE } from '@/lib/opps/geo';

export type Interests = {
  sports: string[];
  country?: string;  // label (es. "Italia")
  region?: string;
  province?: string;
  city?: string;
};

const LS_KEY = 'cp_interests_v1';

export default function InterestsPanel({
  value,
  onChange,
}: {
  value?: Interests;
  onChange?: (v: Interests) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<Interests>({ sports: [] });

  // load from props or localStorage
  useEffect(() => {
    if (value) {
      setLocal(value);
      return;
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setLocal(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, [value]);

  // derived lists
  const selectedCountryCode = useMemo(() => {
    if (!local.country) return '';
    const found = COUNTRIES.find((c) => c.label === local.country);
    return found?.code ?? (local.country === 'Italia' ? 'IT' : '');
  }, [local.country]);

  const provinces = useMemo(
    () => (selectedCountryCode === 'IT' && local.region ? PROVINCES_BY_REGION[local.region] ?? [] : []),
    [selectedCountryCode, local.region],
  );
  const cities = useMemo(
    () => (selectedCountryCode === 'IT' && local.province ? CITIES_BY_PROVINCE[local.province] ?? [] : []),
    [selectedCountryCode, local.province],
  );

  function persist(next: Interests) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
    onChange?.(next);
  }

  function toggleSport(s: string) {
    const set = new Set(local.sports);
    if (set.has(s)) set.delete(s); else set.add(s);
    const next = { ...local, sports: Array.from(set) };
    setLocal(next);
  }

  function save() {
    const next = { ...local };
    // cleanup cascata
    if (selectedCountryCode !== 'IT') {
      next.region = undefined;
      next.province = undefined;
      next.city = undefined;
    } else {
      if (!next.region) { next.province = undefined; next.city = undefined; }
      if (!next.province) { next.city = undefined; }
    }
    setLocal(next);
    persist(next);
    setEditing(false);
  }

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Interessi</div>
        <button
          className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? 'Chiudi' : 'Modifica'}
        </button>
      </div>

      {!editing ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {(local.sports?.length ? local.sports : ['Tutti gli sport']).map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {t}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {local.country && <span className="text-xs px-2 py-1 rounded-full bg-gray-50 border">{local.country}</span>}
            {local.region && <span className="text-xs px-2 py-1 rounded-full bg-gray-50 border">{local.region}</span>}
            {local.province && <span className="text-xs px-2 py-1 rounded-full bg-gray-50 border">{local.province}</span>}
            {local.city && <span className="text-xs px-2 py-1 rounded-full bg-gray-50 border">{local.city}</span>}
            {!local.country && <span className="text-xs text-gray-500">Nessuna area selezionata</span>}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">Sport</div>
            <div className="grid grid-cols-2 gap-2">
              {SPORTS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={local.sports?.includes(s) ?? false}
                    onChange={() => toggleSport(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <div className="text-xs text-gray-600 mb-1">Paese</div>
              <select
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
                value={local.country || ''}
                onChange={(e) => setLocal((v) => ({ ...v, country: e.target.value || undefined }))}
              >
                <option value="">—</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>

            {selectedCountryCode === 'IT' && (
              <>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Regione</div>
                  <select
                    className="w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={local.region || ''}
                    onChange={(e) =>
                      setLocal((v) => ({ ...v, region: e.target.value || undefined, province: undefined, city: undefined }))
                    }
                  >
                    <option value="">—</option>
                    {ITALY_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">Provincia</div>
                  {provinces.length ? (
                    <select
                      className="w-full rounded-lg border px-2 py-1.5 text-sm"
                      value={local.province || ''}
                      onChange={(e) =>
                        setLocal((v) => ({ ...v, province: e.target.value || undefined, city: undefined }))
                      }
                    >
                      <option value="">—</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-lg border px-2 py-1.5 text-sm"
                      placeholder="Provincia"
                      value={local.province || ''}
                      onChange={(e) => setLocal((v) => ({ ...v, province: e.target.value || undefined }))}
                    />
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">Città</div>
                  {cities.length ? (
                    <select
                      className="w-full rounded-lg border px-2 py-1.5 text-sm"
                      value={local.city || ''}
                      onChange={(e) => setLocal((v) => ({ ...v, city: e.target.value || undefined }))}
                    >
                      <option value="">—</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-lg border px-2 py-1.5 text-sm"
                      placeholder="Città"
                      value={local.city || ''}
                      onChange={(e) => setLocal((v) => ({ ...v, city: e.target.value || undefined }))}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setEditing(false)}>Annulla</button>
            <button className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm" onClick={save}>Salva</button>
          </div>
        </div>
      )}
    </section>
  );
}
