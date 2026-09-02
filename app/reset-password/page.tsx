'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

;

import { useI18n } from '@/components/i18n/I18nProvider';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const initialEmail = params.get('email')?.trim();
      if (initialEmail) setEmail(initialEmail);
    } catch {
      // Ignora URL non leggibili: il form resta compilabile manualmente.
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setOk(t('auth.resetSent'));
    } catch (e: any) {
      setErr(e?.message ?? t('auth.resetError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">{t('auth.resetTitle')}</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          {t('auth.resetHelp')}
        </p>

        {err && <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        {ok && <p className="rounded-md border border-green-300 bg-green-50 p-2 text-sm text-green-700">{ok}</p>}

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
            {busy ? t('auth.sending') : t('auth.sendReset')}
          </button>
        </form>

        <p className="text-xs text-gray-500">
          {t('auth.resetLinkHelp')}
        </p>
        <p className="text-center text-sm text-gray-600">
          <a href="/login" className="underline underline-offset-4">
            Torna al login
          </a>
        </p>
      </div>
    </main>
  );
}
