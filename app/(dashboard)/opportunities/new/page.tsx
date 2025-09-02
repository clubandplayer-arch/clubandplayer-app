'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

function NewOpportunityInner() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [role, setRole] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const r = (data.user?.user_metadata as any)?.role ?? null;
      if (alive) {
        setRole(r);
        if (!r) router.replace('/onboarding');
      }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (role !== 'club') {
      setErr('Solo i Club possono creare opportunità.');
      return;
    }
    if (title.trim().length < 3) {
      setErr('Titolo troppo corto (min 3 caratteri).');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      // Torna alla lista
      router.replace('/opportunities');
    } catch (e: any) {
      setErr(e?.message ?? 'Errore durante la creazione.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Nuova opportunità</h1>
          <a className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" href="/opportunities">
            ← Torna alla lista
          </a>
        </div>

        {role !== 'club' && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            Solo i <strong>Club</strong> possono creare opportunità.
          </div>
        )}

        {err && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Titolo</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Descrizione</label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 min-h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Dettagli dell'opportunità…"
            />
          </div>

          <button
            type="submit"
            disabled={busy || role !== 'club'}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Creazione…' : 'Crea opportunità'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewOpportunityPage() {
  return (
    <AuthGuard>
      <NewOpportunityInner />
    </AuthGuard>
  );
}
