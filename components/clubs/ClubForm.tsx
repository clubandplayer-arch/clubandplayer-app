'use client';

import { useState } from 'react';
import type { Club } from '@/types/club';

export default function ClubForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Partial<Club>;
  onCancel: () => void;
  onSaved: (saved: Club) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [displayName, setDisplayName] = useState(initial?.display_name ?? initial?.name ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [country, setCountry] = useState(initial?.country ?? 'IT');
  const [level, setLevel] = useState(initial?.level ?? 'amateur');
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEdit = Boolean(initial?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        display_name: displayName.trim(),
        city: city.trim() || null,
        country: country.trim() || null,
        level: (level || '').trim() || null,
        logo_url: logoUrl.trim() || null,
      };
      const res = await fetch(isEdit ? `/api/clubs/${initial!.id}` : '/api/clubs', {
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Display name</label>
        <input className="w-full rounded-xl border px-3 py-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input className="w-full rounded-xl border px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <input className="w-full rounded-xl border px-3 py-2" value={country ?? ''} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Level</label>
          <select className="w-full rounded-xl border px-3 py-2" value={level ?? ''} onChange={(e) => setLevel(e.target.value as any)}>
            <option value="">(none)</option>
            <option value="pro">pro</option>
            <option value="semi-pro">semi-pro</option>
            <option value="amateur">amateur</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Logo URL</label>
        <input className="w-full rounded-xl border px-3 py-2" value={logoUrl ?? ''} onChange={(e) => setLogoUrl(e.target.value)} />
      </div>

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
