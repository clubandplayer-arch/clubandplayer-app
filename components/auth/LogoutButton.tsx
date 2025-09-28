"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = { className?: string; label?: string };

export default function LogoutButton({ className, label = "Logout" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();

      // (Best effort) chiedi al server di azzerare i cookie bridged
      // Se il tuo /api/auth/session già gestisce il "logout" quando mancano i token, bene;
      // altrimenti questa fetch può fallire senza impattare il signout client.
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ access_token: null, refresh_token: null }),
        });
      } catch {}

      // Vai alla login (o dove preferisci)
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
      aria-busy={loading}
    >
      {loading ? "…" : label}
    </button>
  );
}
