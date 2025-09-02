'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (pwd1.length < 8) {
      setErr('La password deve contenere almeno 8 caratteri.');
      return;
    }
    if (pwd1 !== pwd2) {
      setErr('Le password non coincidono.');
      return;
    }

    setBusy(true);
    try {
      // Il link di recovery di Supabase crea una sessione temporanea nel browser.
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;

      setOk('Password aggiornata correttamente. Ora puoi accedere.');
      setTimeout(() => router.replace('/login'), 1200);
    } catch (e: any) {
      setErr(e?.message ?? 'Errore durante l’aggiornamento della password (link scaduto?).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">Imposta nuova password</h1>

        {err && (
          <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {err}
          </p>
        )}
        {ok && (
          <p className="rounded-md border border-green-300 bg-green-50 p-2 text-sm text-green-700">
            {ok}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            Nuova password
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>

          <label className="block text-sm">
            Conferma password
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Aggiorno…' : 'Aggiorna password'}
          </button>
        </form>

        <p className="text-xs text-gray-500">
          Se vedi errori, prova a ripetere il reset dalla pagina{' '}
          <a href="/reset-password" className="underline">reset-password</a>.
        </p>
      </div>
    </main>
  );
}
