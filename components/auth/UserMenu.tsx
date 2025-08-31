"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        setEmail(null);
      } else {
        setEmail(data.user?.email ?? null);
      }
      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !email) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">{email}</span>
      <button
        onClick={handleLogout}
        className="px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50"
      >
        Logout
      </button>
    </div>
  );
}

export default UserMenu;
