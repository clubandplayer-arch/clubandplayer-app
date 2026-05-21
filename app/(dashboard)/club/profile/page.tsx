'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import ProfileEditForm from '@/components/profiles/ProfileEditForm';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const ENABLE_REGISTRY_CLAIM =
  process.env.NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM === 'true';

type RegistryClub = {
  id: string;
  source_club_id: string | null;
  name: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  claim_status?: string | null;
  claimed_at?: string | null;
};

type RegistryClaim = {
  id: string;
  claim_status: string;
  submitted_at: string | null;
  registry_club_id: string;
  registry_clubs: RegistryClub | RegistryClub[] | null;
};

type RegistryState =
  | {
      status: 'loading';
      club: null;
      claim: null;
      error: '';
    }
  | {
      status: 'verified';
      club: RegistryClub;
      claim: null;
      error: '';
    }
  | {
      status: 'pending';
      club: RegistryClub | null;
      claim: RegistryClaim;
      error: '';
    }
  | {
      status: 'none';
      club: null;
      claim: null;
      error: '';
    }
  | {
      status: 'error';
      club: null;
      claim: null;
      error: string;
    };

function normalizeRegistryClub(value: RegistryClub | RegistryClub[] | null): RegistryClub | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function RegistryConiCard({ state }: { state: RegistryState }) {
  if (state.status === 'loading') {
    return (
      <section className="glass-panel border border-emerald-100 bg-emerald-50/60 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Registro CONI
        </p>
        <h2 className="heading-h2 mt-1 mb-2">Controllo stato Registro CONI...</h2>
        <p className="text-sm text-emerald-950">
          Stiamo verificando se la tua società è già collegata al profilo Club.
        </p>
      </section>
    );
  }

  if (state.status === 'verified') {
    return (
      <section className="glass-panel border border-emerald-200 bg-emerald-50/80 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Registro CONI
        </p>
        <h2 className="heading-h2 mt-1 mb-2">Registro CONI verificato</h2>
        <p className="mb-4 text-sm text-emerald-950">
          La tua società è già stata verificata e collegata al profilo Club.
        </p>

        <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950">
          <p className="font-semibold">{state.club.name || 'Società collegata'}</p>
          <p className="mt-1 text-xs text-emerald-800">
            ID CONI: {state.club.source_club_id || '—'}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            {[state.club.region, state.club.province, state.club.municipality]
              .filter(Boolean)
              .join(' · ') || 'Località —'}
          </p>
        </div>
      </section>
    );
  }

  if (state.status === 'pending') {
    const club = state.club;

    return (
      <section className="glass-panel border border-yellow-200 bg-yellow-50/80 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
          Registro CONI
        </p>
        <h2 className="heading-h2 mt-1 mb-2">Verifica in corso</h2>
        <p className="mb-4 text-sm text-yellow-950">
          Hai già inviato una richiesta di collegamento. La richiesta è in attesa di approvazione admin.
        </p>

        <div className="rounded-xl border border-yellow-200 bg-white p-4 text-sm text-yellow-950">
          <p className="font-semibold">{club?.name || 'Società in verifica'}</p>
          <p className="mt-1 text-xs text-yellow-800">
            ID CONI: {club?.source_club_id || '—'}
          </p>
          <p className="mt-1 text-xs text-yellow-800">
            {[club?.region, club?.province, club?.municipality]
              .filter(Boolean)
              .join(' · ') || 'Località —'}
          </p>
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="glass-panel border border-red-200 bg-red-50/80 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">
          Registro CONI
        </p>
        <h2 className="heading-h2 mt-1 mb-2">Stato non disponibile</h2>
        <p className="mb-4 text-sm text-red-950">{state.error}</p>
        <Link
          href="/club/registry-claim"
          className="inline-flex rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          Vai alla pagina Registro CONI
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel border border-emerald-100 bg-emerald-50/60 p-5 md:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        Registro CONI
      </p>
      <h2 className="heading-h2 mt-1 mb-2">Rivendica la tua società</h2>
      <p className="mb-4 text-sm text-emerald-950">
        Cerca la tua ASD/SSD nel Registro CONI e collegala al profilo Club. Dopo l’approvazione admin, sul profilo pubblico apparirà il badge Registro CONI verificato.
      </p>
      <Link
        href="/club/registry-claim"
        className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        Rivendica società Registro CONI
      </Link>
    </section>
  );
}

export default function ProfilePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [registryState, setRegistryState] = useState<RegistryState>({
    status: 'loading',
    club: null,
    claim: null,
    error: '',
  });

  useEffect(() => {
    if (!ENABLE_REGISTRY_CLAIM) return;

    let active = true;

    async function loadRegistryState() {
      setRegistryState({
        status: 'loading',
        club: null,
        claim: null,
        error: '',
      });

      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;

        if (!user) {
          if (!active) return;
          setRegistryState({
            status: 'error',
            club: null,
            claim: null,
            error: 'Sessione non disponibile. Effettua nuovamente il login.',
          });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, account_type, type')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const profileId = profile?.id ? String(profile.id) : '';
        const accountType = String(profile?.account_type || profile?.type || '').toLowerCase();

        if (!profileId || accountType !== 'club') {
          if (!active) return;
          setRegistryState({
            status: 'none',
            club: null,
            claim: null,
            error: '',
          });
          return;
        }

        const { data: claimedClub, error: claimedClubError } = await supabase
          .from('registry_clubs')
          .select('id, source_club_id, name, region, province, municipality, claim_status, claimed_at')
          .eq('claimed_by_profile_id', profileId)
          .eq('claim_status', 'claimed')
          .order('claimed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (claimedClubError) throw claimedClubError;

        if (claimedClub) {
          if (!active) return;
          setRegistryState({
            status: 'verified',
            club: claimedClub as RegistryClub,
            claim: null,
            error: '',
          });
          return;
        }

        const { data: pendingClaim, error: pendingClaimError } = await supabase
          .from('registry_claims')
          .select(
            `
            id,
            claim_status,
            submitted_at,
            registry_club_id,
            registry_clubs (
              id,
              source_club_id,
              name,
              region,
              province,
              municipality
            )
          `
          )
          .eq('profile_id', profileId)
          .in('claim_status', ['pending', 'in_review'])
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingClaimError) throw pendingClaimError;

        if (pendingClaim) {
          const claim = pendingClaim as RegistryClaim;

          if (!active) return;
          setRegistryState({
            status: 'pending',
            club: normalizeRegistryClub(claim.registry_clubs),
            claim,
            error: '',
          });
          return;
        }

        if (!active) return;
        setRegistryState({
          status: 'none',
          club: null,
          claim: null,
          error: '',
        });
      } catch (err) {
        console.error('[club/profile] registry state lookup failed', err);

        if (!active) return;
        setRegistryState({
          status: 'error',
          club: null,
          claim: null,
          error: 'Non è stato possibile recuperare lo stato Registro CONI.',
        });
      }
    }

    loadRegistryState();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Modifica dati club</h1>
      </header>

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">Dati club</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Compila o aggiorna le informazioni principali del club, inclusi foto profilo, località e impianto.
        </p>
        <ProfileEditForm />
      </section>

      {ENABLE_REGISTRY_CLAIM ? <RegistryConiCard state={registryState} /> : null}
    </main>
  );
}