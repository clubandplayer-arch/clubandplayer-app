'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OAuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState('Sto completando l’accesso…');

  useEffect(() => {
    (async () => {
      // Se Google/Supabase hanno dato errore, lo mostriamo
      const extError = search.get('error') || search.get('error_description');
      if (extError) {
        setMsg(`Errore provider: ${extError}`);
        return;
      }

      try {
        // IMPORTANTISSIMO: passare l’URL COMPLETO all’exchange
        const { error } = await supabase.auth.exchangeCodeForSession(
          typeof window !== 'undefined' ? window.location.href : ''
        );
        if (error) throw error;

        // Sync cookie SSR per le route handler server-side
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });
        }

        // Vai alla home (o alla pagina da te preferita)
        router.replace('/');
      } catch (e: any) {
        setMsg(e?.message || 'Errore durante lo scambio del codice.');
      }
    })();
  }, [router, search]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="rounded-xl border p-4 text-sm">{msg}</div>
    </main>
  );
}
