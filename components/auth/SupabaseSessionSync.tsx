// components/auth/SupabaseSessionSync.tsx
"use client";

import { useEffect } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SupabaseSessionSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // invia la sessione attuale al server (utile su refresh hard)
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session ?? null;
      void fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "INITIAL_SESSION", session }),
      });
    });

    // ascolta i cambi di auth e sincronizza i cookie server
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        void fetch("/api/auth/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event, session }),
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
