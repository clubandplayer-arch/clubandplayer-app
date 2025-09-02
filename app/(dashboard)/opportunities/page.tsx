'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import OpportunitiesClient from './Client';

function PageInner() {
  const router = useRouter();

  // Se l’utente non ha completato l’onboarding (manca user_metadata.role) → vai a /onboarding
  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      const role = (data.user?.user_metadata as any)?.role;
      if (alive && !role) {
        router.replace('/onboarding');
      }
    })();
    return () => { alive = false; };
  }, [router]);

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Opportunità</h1>
        <a
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          href="/onboarding"
        >
          Cambia profilo
        </a>
      </div>
      <OpportunitiesClient />
    </main>
  );
}

export default function OpportunitiesPage() {
  return (
    <AuthGuard>
      <PageInner />
    </AuthGuard>
  );
}
