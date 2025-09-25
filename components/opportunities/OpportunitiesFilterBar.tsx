'use client';

import { useState } from 'react';

export type OppFilters = {
  role?: string; // es. 'POR', 'ATT', 'Centrocampista'
  city?: string; // es. 'Catania'
};

export default function OpportunitiesFilterBar({
  initial,
  onApply,
  className,
}: {
  initial?: OppFilters;
  onApply: (f: OppFilters) => void;
  className?: string;
}) {
  const [role, setRole] = useState(initial?.role ?? '');
  const [city, setCity] = useState(initial?.city ?? '');

  function apply() {
    onApply({
      role: role.trim() || undefined,
      city: city.trim() || undefined,
    });
  }

  function reset() {
    setRole('');
    setCity('');
    onApply({});
  }

  return (
    <div
      className={[
        'rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
        className || '',
      ].join(' ')}
    >
      <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        🔎 Filtri
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Ruolo/Posizione
          </label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Es. Portiere, ATT, Centrocampista…"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Città
          </label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Es. Catania, Siracusa…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-1">
          <button
            type="button"
            onClick={apply}
            className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Applica
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
