'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Opportunity = {
  id: string | number;
  title?: string | null;
  created_at?: string | null;
  // aggiungi qui altri campi se ti servono (es. city, club_id, ecc.)
};

function OpportunitiesPageContent() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) Sessione utente
        const { data: sessionRes } = await supabase.auth.getSession();
        const user = sessionRes.session?.user ?? null;
        if (!user) {
          router.replace('/login');
          return;
        }

        // 2) Onboarding: se manca il ruolo → vai a /onboarding
        const role = (user.user_metadata as any)?.role;
        if (!role) {
          router.replace('/onboarding');
          return;
        }

        // 3) Carica opportunità (adatta la query alla tua tabella/viste)
        const { data, error } = await supabase
          .from('opportunities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!alive) return;

        setRows((data ?? []) as Opportunity[]);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Errore non specificato durante il caricamento');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Opportunità</h1>

      {loading && (
        <div className="rounded-md border p-4 text-sm text-gray-600">
          Caricamento in corso…
        </div>
      )}

      {!loading && err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div className="rounded-md border p-4 text-sm text-gray-600">
          Nessuna opportunità disponibile. Crea la prima o modifica i filtri.
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={String(o.id)} className="rounded-md border p-3">
              <div className="font-medium">{o.title ?? `#${o.id}`}</div>
              {o.created_at && (
                <div className="text-xs text-gray-500">
                  creata il {new Date(o.created_at).toLocaleString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
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
