'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function BlockedPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = supabaseBrowser();

  const status = useMemo(() => (sp.get('status') || 'pending').toLowerCase(), [sp]);

  const title = status === 'rejected'
    ? 'Il tuo account non è stato approvato'
    : 'Il tuo account è in attesa di approvazione';
  const body = status === 'rejected'
    ? 'Controlla la tua email o contatta il supporto per maggiori informazioni.'
    : 'Ti avviseremo quando il tuo profilo sarà attivo.';

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="heading-h2 mb-3 text-3xl font-bold">{title}</h1>
      <p className="mb-8 text-neutral-700">{body}</p>
      <button
        onClick={logout}
        className="rounded-full bg-[var(--brand)] px-5 py-2 text-white shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
      >
        Esci
      </button>
    </main>
  );
}
