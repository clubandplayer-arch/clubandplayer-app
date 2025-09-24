'use client';

import { useState } from 'react';

type AnyProps = any;

/**
 * Fallback "sicuro" del form Club.
 * Accetta qualsiasi prop; chiama onSubmit(values) se presente.
 */
export default function ClubForm(props: AnyProps) {
  const initial = props?.initial ?? {};
  const [name, setName] = useState<string>(initial.name ?? '');
  const [city, setCity] = useState<string>(initial.city ?? '');
  const [saving, setSaving] = useState(false);
  const onSubmit = typeof props?.onSubmit === 'function' ? props.onSubmit : undefined;
  const onCancel = typeof props?.onCancel === 'function' ? props.onCancel : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const values = { name: name.trim(), city: city.trim() };
      await Promise.resolve(onSubmit?.(values));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium">Nome club</label>
        <input
          className="w-full rounded-md border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. ASD Example"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Città</label>
        <input
          className="w-full rounded-md border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Es. Siracusa"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {saving ? 'Salvo…' : 'Salva'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}
