'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [busy, setBusy] = useState<string | null>(null);

  async function oauth(provider: 'google' | 'facebook' | 'twitter' | 'apple') {
    try {
      setBusy(provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          // facoltativo: force refresh
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) alert(error.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-[80vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-6 bg-white/80 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2 text-brand">Benvenuto su Club&Player</h1>
        <p className="text-gray-600 mb-6">
          La prima community per <strong>Atleti</strong> & <strong>Club</strong>.
          Accedi per iniziare.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => oauth('google')}
            disabled={!!busy}
            className="w-full rounded-xl px-4 py-3 bg-brand text-white font-medium hover:opacity-95 disabled:opacity-60"
          >
            {busy === 'google' ? '…' : 'Accedi con Google'}
          </button>

          <button
            onClick={() => oauth('facebook')}
            disabled={!!busy}
            className="w-full rounded-xl px-4 py-3 bg-[#1877F2] text-white font-medium hover:opacity-95 disabled:opacity-60"
          >
            {busy === 'facebook' ? '…' : 'Accedi con Facebook'}
          </button>

          <button
            onClick={() => oauth('twitter')}
            disabled={!!busy}
            className="w-full rounded-xl px-4 py-3 bg-black text-white font-medium hover:opacity-95 disabled:opacity-60"
          >
            {busy === 'twitter' ? '…' : 'Accedi con X (Twitter)'}
          </button>

          <button
            onClick={() => oauth('apple')}
            disabled={!!busy}
            className="w-full rounded-xl px-4 py-3 border font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {busy === 'apple' ? '…' : 'Accedi con Apple'}
          </button>
        </div>
      </div>
    </main>
  );
}
