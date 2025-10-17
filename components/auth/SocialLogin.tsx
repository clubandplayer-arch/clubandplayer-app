'use client';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SocialLogin() {
  async function signInWithGoogle() {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        // refresh token affidabile
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
    >
      {/* logo google minimal */}
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.7-5.5 3.7a6.4 6.4 0 1 1 0-12.8 5.6 5.6 0 0 1 4 1.6l2.7-2.7A9.4 9.4 0 1 0 12 21.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"/>
        <path fill="#4285F4" d="M12 10.2v3.9h5.5c-.4 2.3-2.2 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6a5.6 5.6 0 0 1 4 1.6l2.7-2.7A9.4 9.4 0 1 0 12 21.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z" opacity=".001"/>
      </svg>
      Continua con Google
    </button>
  );
}
