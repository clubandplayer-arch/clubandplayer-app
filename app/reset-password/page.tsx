"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/common/ToastProvider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/update-password`
          : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );

      if (resetError) throw resetError;

      success("Email inviata. Controlla la posta per il link di reset.");
      router.push("/login");
    } catch (err) {
      error("", {
        title: "Errore reset password",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full bg-white shadow rounded-lg p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Reset password</h1>
        <p className="text-sm text-slate-600">
          Inserisci la tua email: ti invieremo un link per impostare una nuova password.
        </p>
        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-3 py-2"
        >
          {loading ? "Invio..." : "Invia link di reset"}
        </button>
      </form>
    </main>
  );
}
