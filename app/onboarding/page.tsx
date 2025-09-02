'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Role = 'player' | 'club';

function OnboardingInner() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [selected, setSelected] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Se hai già un ruolo, salta direttamente a /opportunities
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const role = (data.user?.user_metadata as any)?.role as Role | undefined;
      if (alive && role) {
        router.replace('/opportunities');
      }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  const save = async () => {
    setErr(null);
    if (!selected) {
      setErr('Seleziona un profilo per continuare.');
      return;
    }
    setBusy(true);
    try {
      // 1) Scrive il ruolo nei metadata dell’utente
      const { error } = await supabase.auth.updateUser({
        data: { role: selected },
      });
      if (error) throw error;

      // 2) (Opzionale) Crea record profilo in DB:
      //    Scommenta/Adatta in base alle tue tabelle.
      /*
      if (selected === 'player') {
        await supabase.from('players').insert({ user_id: data.user!.id }).single();
      } else {
        await supabase.from('clubs').insert({ owner_id: data.user!.id, name: 'Nuovo Club' }).single();
      }
      */

      // 3) Vai subito alle opportunità
      router.replace('/opportunities');
    } catch (e: any) {
      setErr(e?.message ?? 'Errore durante il salvataggio del profilo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border p-6 shadow-sm space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Benvenuto! Scegli il tuo profilo</h1>
          <p className="text-sm text-gray-600 mt-1">
            Questa scelta ci aiuta a mostrarti il contenuto più adatto.
          </p>
        </header>

        {err && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSelected('player')}
            className={`rounded-xl border p-4 text-left transition ${
              selected === 'player'
                ? 'border-black ring-2 ring-black'
                : 'hover:border-black/50'
            }`}
            aria-pressed={selected === 'player'}
          >
            <div className="text-lg font-medium">Giocatore</div>
            <p className="text-sm text-gray-600 mt-1">
              Cerca opportunità, candidati, gestisci il tuo profilo sportivo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelected('club')}
            className={`rounded-xl border p-4 text-left transition ${
              selected === 'club'
                ? 'border-black ring-2 ring-black'
                : 'hover:border-black/50'
            }`}
            aria-pressed={selected === 'club'}
          >
            <div className="text-lg font-medium">Club</div>
            <p className="text-sm text-gray-600 mt-1">
              Pubblica opportunità, gestisci candidature e visibilità del club.
            </p>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy || !selected}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Salvataggio…' : 'Continua'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingInner />
    </AuthGuard>
  );
}
