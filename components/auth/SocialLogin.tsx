// components/auth/SocialLogin.tsx
'use client';

import { useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AppleAuthButton from '@/components/auth/AppleAuthButton';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const HAS_ENV = Boolean(SUPA_URL && SUPA_ANON);

type SocialLoginProps = {
  label?: string;
  provider?: 'google' | 'apple';
};

const providerLabels = {
  google: 'Continua con Google',
  apple: 'Continua con Apple',
};

const providerErrors = {
  google: 'Accesso con Google non riuscito.',
  apple: 'Accesso con Apple non riuscito.',
};

export default function SocialLogin({ label, provider = 'google' }: SocialLoginProps) {
  const [loading, setLoading] = useState(false);

  const AuthButton = provider === 'apple' ? AppleAuthButton : GoogleAuthButton;

  async function signInWithProvider() {
    try {
      setLoading(true);

      if (!HAS_ENV || !SUPA_URL || !SUPA_ANON) {
        alert('Configurazione Supabase mancante.');
        return;
      }

      const supabase = createSupabaseClient(SUPA_URL, SUPA_ANON);

      // redirect SUL DOMINIO CORRENTE, sempre
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo, // torna sempre qui
          // scopes: 'email profile', // opzionale
        },
      });
      if (error) throw error; // il browser ora viene rediretto
    } catch (e) {
      console.error(e);
      alert(providerErrors[provider]);
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = loading ? 'Attendere…' : label ?? providerLabels[provider];

  return (
    <AuthButton
      label={buttonLabel}
      onClick={signInWithProvider}
      disabled={loading || !HAS_ENV}
    />
  );
}
