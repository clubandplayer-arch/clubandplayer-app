"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import React from "react";

function OpportunitiesPageContent() {
  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Opportunità</h1>
      {/* Inserisci qui il contenuto già esistente della tua pagina opportunities */}
    </main>
  );
}

export default function OpportunitiesPageWrapper() {
  return (
    <AuthGuard>
      <OpportunitiesPageContent />
    </AuthGuard>
  );
}
