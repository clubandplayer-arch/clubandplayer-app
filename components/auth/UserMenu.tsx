"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UserInfo = { id: string; email: string | null };

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    })();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();

    // best-effort: azzera cookie bridged lato server
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token: null, refresh_token: null }),
      });
    } catch {}

    router.push("/login");
  }

  if (loading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="rounded-xl border px-3 py-1.5 text-sm"
      >
        Login
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-80">{user.email ?? "Account"}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-xl border px-3 py-1.5 text-sm"
      >
        Logout
      </button>
    </div>
  );
}
