'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type AccountType = 'club' | 'athlete';

export default function ChooseRolePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<AccountType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Se l'utente ha già un account_type, non mostriamo la scelta
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json();
        if (j?.account_type) {
          router.replace('/'); // già impostato
          return;
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, [router]);

  async function choose(t: AccountType) {
    setSaving(t);
    setError(null);
    try {
      const r = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account_type: t }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Impossibile salvare il ruolo');
      }
      // Dopo il salvataggio: vai alla home o a /settings
      router.replace('/settings');
    } catch (e: any) {
      setError(e?.message ?? 'Errore durante il salvataggio');
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-gray-600">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Scegli il tuo ruolo</h1>
      <p className="mb-6 text-sm text-gray-600">
        Per personalizzare l’esperienza, indica se rappresenti un <strong>Club</strong> o sei un <strong>Atleta</strong>.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => choose('club')}
          disabled={saving !== null}
          className="rounded-2xl border p-6 text-left shadow-sm transition hover:shadow-md disabled:opacity-60"
        >
          <div className="text-xl font-semibold">Club</div>
          <div className="mt-1 text-sm text-gray-600">
            Pubblica opportunità, cerca atleti, gestisci la tua pagina club.
          </div>
          {saving === 'club' && (
            <div className="mt-2 text-xs text-blue-700">Salvataggio…</div>
          )}
        </button>

        <button
          onClick={() => choose('athlete')}
          disabled={saving !== null}
          className="rounded-2xl border p-6 text-left shadow-sm transition hover:shadow-md disabled:opacity-60"
        >
          <div className="text-xl font-semibold">Atleta</div>
          <div className="mt-1 text-sm text-gray-600">
            Completa il profilo, trova club e opportunità nella tua zona.
          </div>
          {saving === 'athlete' && (
            <div className="mt-2 text-xs text-blue-700">Salvataggio…</div>
          )}
        </button>
      </div>
    </main>
  );
}
