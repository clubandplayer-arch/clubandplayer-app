'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClubProfilePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch('/api/profiles/me', { cache: 'no-store', credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const profile = j?.profile ?? j;
        if (profile?.type?.toLowerCase?.().startsWith('club')) {
          setName(profile.display_name ?? profile.name ?? '');
          setBio(profile.bio ?? '');
        }
      } catch {
        /* profilo non ancora creato */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErr(null);

    try {
      // salva dati testuali
      const res = await fetch('/api/profiles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'club', display_name: name, bio }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      // upload logo (opzionale, se l’endpoint esiste)
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        await fetch('/api/profiles/logo', { method: 'POST', credentials: 'include', body: fd }).catch(() => {});
      }

      router.push('/opportunities');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Errore salvataggio profilo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Profilo Club</h1>

      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3">
          {err}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Logo</h2>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-md border flex items-center justify-center text-gray-500">
              Nessun logo
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setLogoFile(e.currentTarget.files?.[0] ?? null)}
                disabled={saving}
              />
              <p className="text-xs text-gray-500">Suggerito: PNG/JPG quadrato ≤ 2MB.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Dati</h2>

          <label className="block text-sm font-medium mb-1">Nome Club</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Es. ASD Example"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            disabled={loading || saving}
          />

          <label className="block text-sm font-medium mt-4 mb-1">Bio</label>
          <textarea
            className="w-full min-h-[10rem] rounded-md border px-3 py-2"
            placeholder="Racconta qualcosa sul club..."
            value={bio}
            onChange={(e) => setBio(e.currentTarget.value)}
            disabled={loading || saving}
          />
        </section>

        <button
          type="submit"
          disabled={saving || loading}
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
      </form>
    </div>
  );
}
