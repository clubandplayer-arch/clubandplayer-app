'use client';

import { useState } from 'react';
import type { Opportunity } from '@/types/opportunity';

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
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEdit = Boolean(initial?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const t = title.trim();
    if (!t) { setErr('Title is required'); return; }

    setSaving(true);
    try {
      const payload = { title: t, description: (description || '').trim() || null };
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Titolo *</label>
        <input className="w-full rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Descrizione</label>
        <textarea className="w-full rounded-xl border px-3 py-2 min-h-28" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
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
