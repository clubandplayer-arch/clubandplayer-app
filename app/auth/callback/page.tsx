// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

function parseFragment(hash: string): Record<string, string> {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const out: Record<string, string> = {};
  for (const part of h.split('&')) {
    const [k, v] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = supabaseBrowser();

  const [msg, setMsg] = useState('Completo l’accesso…');

  useEffect(() => {
    (async () => {
      try {
        // DEBUG veloce
        if (typeof window !== 'undefined') {
          console.log('[callback] href:', window.location.href);
          console.log('[callback] search:', window.location.search);
          console.log('[callback] hash:', window.location.hash);
        }

        // 1) Implicit flow (#access_token & #refresh_token)
        if (typeof window !== 'undefined' && window.location.hash) {
          const frag = parseFragment(window.location.hash);
          const access_token = frag['access_token'] || null;
          const refresh_token = frag['refresh_token'] || null;

          const fragmentErr = frag['error_description'] || frag['error'];
          if (fragmentErr) throw new Error(fragmentErr);

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;

            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ access_token, refresh_token }),
            }).catch(() => {});

            router.replace('/');
            return;
          }
        }

        // 2) PKCE flow (?code=...)
        const code = search.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const session = data.session;
          if (session) {
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }),
            }).catch(() => {});
          }

          router.replace('/');
          return;
        }

        // 3) Nessun token, nessun code → errore
        const err =
          search.get('error_description') ||
          search.get('error') ||
          'Missing auth response';
        throw new Error(err);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? 'Errore durante il login.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-2 text-center">
        <div className="text-lg font-semibold">Accesso</div>
        <p className="text-sm text-gray-600">{msg}</p>
      </div>
    </main>
  );
}
