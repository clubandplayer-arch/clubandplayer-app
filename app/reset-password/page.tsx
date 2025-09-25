'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setOk(
        'Email inviata. Controlla la tua casella e segui il link per impostare la nuova password.',
      );
    } catch (e: any) {
      setErr(e?.message ?? 'Errore durante l’invio dell’email di reset.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Reimposta password</h1>

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
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Invio…' : 'Invia email di reset'}
          </button>
        </form>

        <p className="text-xs text-gray-500">
          Riceverai un link che ti porterà alla pagina <code>/update-password</code> per impostare
          la nuova password.
        </p>
      </div>
    </main>
  );
}
