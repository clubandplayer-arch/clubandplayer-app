"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/lib/auth/session";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Usa replace per evitare che l'utente torni indietro alla pagina protetta col back
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return <p className="p-4">Caricamento...</p>;
  if (!user) return null;

  return <>{children}</>;
}
