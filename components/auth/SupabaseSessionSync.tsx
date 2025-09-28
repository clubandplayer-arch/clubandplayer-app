'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export default function SupabaseSessionSync() {
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    let mounted = true;

    // Prime: verifica utente e "riscalda" cookie server
    (async () => {
      try {
        const { data }: { data: { user: User | null } } = await supabase.auth.getUser();
        // opzionale: ping a whoami per coerenza cookie lato server
        await fetch('/api/auth/whoami', { cache: 'no-store' });
      } catch {
        // ignora
      }
    })();

    // Sync cookie server ↔︎ client ad ogni cambio sessione
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        const access_token = session?.access_token ?? null;
        const refresh_token = session?.refresh_token ?? null;

        // invia i token all’endpoint server che imposta i cookie HttpOnly
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token }),
          // niente cache
        }).catch(() => {});
      }
    );

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}
