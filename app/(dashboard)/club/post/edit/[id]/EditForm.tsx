'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function EditForm({ id, initial }: { id: string; initial?: Opp | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(!initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Stato locale — usa optional chaining per evitare crash se initial è undefined/null
  const [title, setTitle] = useState<string>(initial?.title ?? '');
  const [description, setDescription] = useState<string>(initial?.description ?? '');
  const [sport, setSport] = useState<string>(initial?.sport ?? '');
  const [requiredCategory, setRequiredCategory] = useState<string>(
    initial?.required_category ?? '',
  );
  const [city, setCity] = useState<string>(initial?.city ?? '');
  const [province, setProvince] = useState<string>(initial?.province ?? '');
  const [region, setRegion] = useState<string>(initial?.region ?? '');
  const [country, setCountry] = useState<string>(initial?.country ?? '');

  // Se initial manca, fai fetch client-side
  useEffect(() => {
    let alive = true;
    async function load() {
      if (initial) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/opportunities/${id}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const o: Opp | undefined = j?.data ?? j;
        if (!alive) return;
        if (!o) throw new Error('not_found');

        setTitle(o.title ?? '');
        setDescription(o.description ?? '');
        setSport(o.sport ?? '');
        setRequiredCategory(o.required_category ?? '');
        setCity(o.city ?? '');
        setProvince(o.province ?? '');
        setRegion(o.region ?? '');
        setCountry(o.country ?? '');
      } catch (e: any) {
        if (!alive) return;
        setErr('Impossibile caricare l’annuncio.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id, initial]);

  const canSubmit = useMemo(() => !loading && title.trim().length > 0, [loading, title]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
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
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      router.push(`/opportunities/${id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-md border p-4 text-gray-600">Caricamento annuncio…</div>;
  }

  if (err) {
    return (
      <div className="rounded-md border p-4">
        <div className="mb-3 text-red-700">{err}</div>
        <button
          onClick={() => {
            // retry
            setErr(null);
            setLoading(true);
            // trigger useEffect by resetting initial (no-op here), but we can just re-run fetch:
            (async () => {
              try {
                const res = await fetch(`/api/opportunities/${id}`, {
                  credentials: 'include',
                  cache: 'no-store',
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const j = await res.json();
                const o: Opp | undefined = j?.data ?? j;
                if (!o) throw new Error('not_found');
                setTitle(o.title ?? '');
                setDescription(o.description ?? '');
                setSport(o.sport ?? '');
                setRequiredCategory(o.required_category ?? '');
                setCity(o.city ?? '');
                setProvince(o.province ?? '');
                setRegion(o.region ?? '');
                setCountry(o.country ?? '');
                setErr(null);
              } catch {
                setErr('Impossibile caricare l’annuncio.');
              } finally {
                setLoading(false);
              }
            })();
          }}
          className="rounded-md border px-3 py-2 hover:bg-gray-50"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm text-gray-600">Titolo</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Es. Cercasi difensore centrale"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px] w-full rounded-md border px-3 py-2"
          placeholder="Dettagli dell'annuncio…"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Sport</label>
          <input
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="es. calcio"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Categoria richiesta</label>
          <input
            value={requiredCategory}
            onChange={(e) => setRequiredCategory(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="female | male | mixed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Città</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Provincia</label>
          <input
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Regione</label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Paese</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="rounded-md border px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <a href={`/opportunities/${id}`} className="rounded-md border px-3 py-2 hover:bg-gray-50">
          Annulla
        </a>
      </div>
    </form>
  );
}
