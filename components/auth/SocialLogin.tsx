// components/auth/SocialLogin.tsx
'use client';

import { useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// dominio di produzione per il redirect (override opzionale con NEXT_PUBLIC_SITE_URL)
const PROD_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://clubandplayer-app.vercel.app';

export default function SocialLogin() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${PROD_ORIGIN}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert('Accesso con Google non riuscito.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      className="mt-1 inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.32 0-6.02-2.75-6.02-6.14S8.18 5.9 11.5 5.9c1.9 0 3.18.8 3.9 1.5l2.66-2.57C16.88 3.5 14.7 2.6 12 2.6 6.95 2.6 2.9 6.65 2.9 11.7c0 5.06 4.05 9.11 9.1 9.11 5.25 0 8.71-3.69 8.71-8.89 0-.6-.06-1.06-.14-1.52H12z"/>
      </svg>
      {loading ? 'Attendere…' : 'Continua con Google'}
    </button>
  );
}
