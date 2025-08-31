"use client";

import { supabase } from "@/lib/supabase/client";

export default function LogoutButton() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  return (
    <button
      onClick={handleLogout}
      className="text-sm text-red-600 hover:underline"
    >
      Logout
    </button>
  );
}
