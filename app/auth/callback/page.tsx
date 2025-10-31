// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

/** Parse dell'hash OAuth (#access_token&refresh_token&...) */
function parseFragment(hash: string): Record<string, string> {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const out: Record<string, string> = {};
  for (const part of h.split('&')) {
    const [k, v] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}

/** Sanifica e limita il redirect a percorsi interni (stessa origin) */
function sanitizeRedirect(input: string | null): string | null {
  if (!input) return null;
  try {
    // Supporta sia path "/qualcosa" che URL assoluti della stessa origin.
    const u = new URL(input, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    // Manteniamo solo path+query+hash
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    // Se non è un URL valido, accettiamo solo path assoluti
    return input.startsWith('/') ? input : null;
  }
}

/** Legge `redirect_to` dai parametri o da sessionStorage (chiave: auth:redirect_to) */
function pickRedirectTarget(search: URLSearchParams): string | null {
  // 1) query ?redirect_to=
  const q = search.get('redirect_to');
  const fromQuery = typeof window !== 'undefined' ? sanitizeRedirect(q) : null;
  if (fromQuery) return fromQuery;

  // 2) sessionStorage (es. impostato da /login)
  if (typeof window !== 'undefined') {
    const raw = sessionStorage.getItem('auth:redirect_to');
    const fromStore = sanitizeRedirect(raw);
    if (fromStore) return fromStore;
  }
  return null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = supabaseBrowser();

  const [msg, setMsg] = useState('Completo l’accesso…');

  // helper: sincronizza cookie SSR + bootstrap profilo + redirect smart
  async function syncAndRoute(access_token: string, refresh_token: string) {
    // 1) sync cookie SSR per Route Handlers
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token }),
      });
    } catch {
      // non fallire il login per un sync instabile
    }

    // 2) crea la riga su profiles se manca
    let accountType: string | null = null;
    try {
      const boot = await fetch('/api/profiles/bootstrap', { method: 'POST' });
      if (boot.ok) {
        const j = await boot.json().catch(() => ({}));
        accountType = j?.data?.account_type ?? null;
      }
    } catch {
      // non bloccare il login se il bootstrap fallisce
    }

    // 3) target di redirect
    let target = pickRedirectTarget(search);

    // Se non è stato specificato nulla, fallback come prima:
    // - se non c'è role/accountType → onboarding/choose-role
    // - altrimenti home/feed
    if (!target) {
      target = accountType ? '/' : '/onboarding/choose-role';
    }

    // pulizia: non tenere il redirect dopo l'uso
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth:redirect_to');
      }
    } catch {}

    router.replace(target);
  }

  useEffect(() => {
    (async () => {
      try {
        // ---- (1) Implicit flow (#access_token & #refresh_token)
        if (typeof window !== 'undefined' && window.location.hash) {
          const frag = parseFragment(window.location.hash);
          const fragmentErr = frag['error_description'] || frag['error'];
          if (fragmentErr) throw new Error(fragmentErr);

          const access_token = frag['access_token'] || null;
          const refresh_token = frag['refresh_token'] || null;

          if (access_token && refresh_token) {
            // salva la sessione nel client SDK
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;

            await syncAndRoute(access_token, refresh_token);
            return;
          }
        }

        // ---- (2) PKCE flow (?code=...)
        const code = search.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const session = data.session;
          if (session?.access_token && session?.refresh_token) {
            await syncAndRoute(session.access_token, session.refresh_token);
            return;
          }

          // se manca la sessione, errore esplicito
          throw new Error('Sessione non disponibile dopo exchange PKCE.');
        }

        // ---- (3) Nessun token, nessun code → errore
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
