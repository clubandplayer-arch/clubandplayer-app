'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function SupabaseSessionSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function push(session: Session | null) {
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(
            session
              ? {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }
              : {}
          ),
        });
      } catch {
        // no-op
      }
    }

    // 1) tenta subito
    supabase
      .auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!active) return;
        void push(data.session);
      });

    // 2) ascolta i cambi stato (login/logout/refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        void push(session);
      }
    );

    // 3) poll di sicurezza (eventuale perdita evento)
    const iv = setInterval(async () => {
      const { data }: { data: { session: Session | null } } =
        await supabase.auth.getSession();
      await push(data.session);
    }, 5000);

    return () => {
      active = false;
      clearInterval(iv);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
