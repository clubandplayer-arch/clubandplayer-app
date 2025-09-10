'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Opp = {
  id: string;
  title: string | null;
  description: string | null;
  sport?: string | null;
  required_category?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;
};

export default function EditForm({ initial }: { initial: Opp }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [sport, setSport] = useState(initial.sport ?? '');
  const [requiredCategory, setRequiredCategory] = useState(initial.required_category ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [province, setProvince] = useState(initial.province ?? '');
  const [region, setRegion] = useState(initial.region ?? '');
  const [country, setCountry] = useState(initial.country ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/opportunities/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          sport,
          required_category: requiredCategory,
          city,
          province,
          region,
          country,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Errore durante il salvataggio');
        return;
      }
      router.push(`/opportunities/${initial.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Titolo</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          placeholder="Es. Cercasi difensore centrale"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-md px-3 py-2 min-h-[120px]"
          placeholder="Dettagli dell'annuncio…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Sport</label>
          <input
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="es. calcio"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Categoria richiesta</label>
          <input
            value={requiredCategory}
            onChange={(e) => setRequiredCategory(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="es. female | male | mixed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Città</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Provincia</label>
          <input
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Regione</label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Paese</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <a
          href={`/opportunities/${initial.id}`}
          className="px-3 py-2 border rounded-md hover:bg-gray-50"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
