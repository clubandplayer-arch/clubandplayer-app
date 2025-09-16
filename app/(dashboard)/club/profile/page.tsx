'use client';

import { useEffect, useState } from 'react';

type Profile = {
  id?: string;
  type?: string;
  display_name?: string;
  bio?: string;
  logo_url?: string | null;
};

const BIO_WORD_LIMIT = 100;

function countWords(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function ClubProfilePage() {
  const [initial, setInitial] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  // Carica "chi sono" (UUID) + profilo corrente
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1) whoami → prendo il mio UUID
        const rWho = await fetch('/api/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        });
        const jWho = await rWho.json().catch(() => ({}));
        if (!cancelled) setMyId(jWho?.user?.id ?? null);

        // 2) profilo corrente (va bene /me per il read)
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
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // helper request che NON lancia eccezioni: mi serve lo status per gestire i fallback
  async function req(method: string, url: string, body: any) {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
      json: (() => {
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          return {};
        }
      })(),
    };
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

      let res;

      if (myId) {
        // ✅ UPDATE con UUID reale
        res = await req('PATCH', `/api/profiles/${myId}`, payload);
        if (!res.ok && res.status === 405) {
          res = await req('PUT', `/api/profiles/${myId}`, payload);
        }
        if (!res.ok && (res.status === 404 || res.status === 405)) {
          // alcuni setup usano /api/clubs/[id]
          res = await req('PATCH', `/api/clubs/${myId}`, payload);
          if (!res.ok && res.status === 405) {
            res = await req('PUT', `/api/clubs/${myId}`, payload);
          }
        }
      } else {
        // fallback estremo (se non ho l’UUID), provo /me
        res = await req('PATCH', `/api/profiles/me`, payload);
        if (!res.ok && res.status === 405) {
          res = await req('PUT', `/api/profiles/me`, payload);
        }
      }

      if (!res?.ok) {
        throw new Error(res?.text || `HTTP ${res?.status}`);
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

  function handleBioChange(v: string) {
    // Hard-cap 100 parole
    const words = v.trim().split(/\s+/).filter(Boolean);
    if (words.length <= BIO_WORD_LIMIT) setBio(v);
    else setBio(words.slice(0, BIO_WORD_LIMIT).join(' '));
  }

  const bioCount = countWords(bio);

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
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-700">Bio</label>
                <span className={`text-xs ${bioCount > BIO_WORD_LIMIT ? 'text-red-600' : 'text-gray-500'}`}>
                  {bioCount}/{BIO_WORD_LIMIT} parole
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => handleBioChange(e.currentTarget.value)}
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
