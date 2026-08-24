// components/auth/SocialLogin.tsx
'use client';

import { useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AppleAuthButton from '@/components/auth/AppleAuthButton';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { useI18n } from '@/components/i18n/I18nProvider';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const HAS_ENV = Boolean(SUPA_URL && SUPA_ANON);

type SocialLoginProps = {
  label?: string;
  provider?: 'google' | 'apple';
};

export default function SocialLogin({ label, provider = 'google' }: SocialLoginProps) {
  const { t } = useI18n();
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
      const baseRedirect = `${origin}/auth/callback`;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const redirectTo = `${baseRedirect}?intent=link&provider=${provider}`;
        const { error } = await (supabase.auth as any).linkIdentity({
          provider,
          options: { redirectTo },
        });
        if (error) throw error;
        return;
      }

      const redirectTo = `${baseRedirect}?intent=signin&provider=${provider}`;

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
      alert(t('auth.socialError', { provider: provider === 'apple' ? 'Apple' : 'Google' }));
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = loading ? t('auth.wait') : label ?? t(provider === 'apple' ? 'auth.continueApple' : 'auth.continueGoogle');

  return (
    <AuthButton
      label={buttonLabel}
      onClick={signInWithProvider}
      disabled={loading || !HAS_ENV}
    />
  );
}
