"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/common/ToastProvider";

/**
 * Flusso:
 * - L’utente clicca il link nell’email → arriva qui con token gestito da Supabase.
 * - Supabase completa il recovery e consente updateUser({ password }).
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Attendi che Supabase completi il recovery (di solito immediato al load della pagina)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setReady(true);
      // Se per qualche motivo non c'è sessione, mostriamo comunque il form
      if (!data.session && mounted) setReady(true);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // qualsiasi cambiamento di stato: siamo pronti
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      error("", { title: "Password troppo corta", description: "Minimo 6 caratteri." });
      return;
    }
    if (password !== password2) {
      error("", { title: "Le password non coincidono", description: "Riprova." });
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      success("Password aggiornata! Ora puoi accedere.");
      router.push("/login");
    } catch (err) {
      error("", {
        title: "Errore aggiornamento password",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p>Preparazione…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full bg-white shadow rounded-lg p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Imposta nuova password</h1>
        <input
          type="password"
          placeholder="Nuova password"
          className="w-full border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder="Ripeti password"
          className="w-full border rounded px-3 py-2"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-3 py-2"
        >
          {loading ? "Aggiorno..." : "Aggiorna password"}
        </button>
      </form>
    </main>
  );
}
