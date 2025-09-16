'use client';

import { useEffect, useState } from 'react';

type Profile = {
  id?: string;
  type?: string;
  display_name?: string;
  bio?: string;
  logo_url?: string | null;
};

export default function ClubProfilePage() {
  const [initial, setInitial] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carica il profilo corrente
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const t = await r.text();
        const j = t ? JSON.parse(t) : {};
        if (cancelled) return;
        const p: Profile = j?.profile ?? j;
        setInitial(p);
        setName(p?.display_name ?? '');
        setBio(p?.bio ?? '');
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Errore nel caricamento profilo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function putJson(url: string, body: any) {
    const res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type: 'club',
        display_name: name.trim(),
        bio: bio.trim(),
      };

      // 1° tentativo: /api/profiles/me
      try {
        await putJson('/api/profiles/me', payload);
      } catch {
        // fallback: /api/clubs/me (se disponibile in progetto)
        await putJson('/api/clubs/me', payload);
      }

      setInitial((p) => ({ ...(p ?? {}), ...payload }));
      alert('Profilo salvato ✔︎');
    } catch (e: any) {
      setError(e?.message ?? 'Salvataggio fallito');
      alert('Errore: ' + (e?.message ?? 'Salvataggio fallito'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Profilo Club</h1>

      {loading ? (
        <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
      ) : (
        <>
          {error && (
            <div className="border rounded-xl p-3 bg-red-50 text-red-700">{error}</div>
          )}

          <section className="rounded-2xl border p-4 space-y-4">
            <h2 className="font-medium">Logo</h2>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-md border bg-white grid place-content-center overflow-hidden">
                {initial?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={initial.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-500">Nessun logo</span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Il caricamento del logo sarà abilitato dopo il wiring dello storage.
                Per ora puoi salvare nome e bio.
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-4 space-y-4">
            <h2 className="font-medium">Dati</h2>

            <div className="space-y-2">
              <label className="block text-sm text-gray-700">Nome Club</label>
              <input
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Es. ASD Example"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-700">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.currentTarget.value)}
                placeholder="Racconta qualcosa sul club…"
                rows={6}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
              >
                {saving ? 'Salvataggio…' : 'Salva profilo'}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
