'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import ProfileEditForm from '@/components/profiles/ProfileEditForm';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useI18n } from '@/components/i18n/I18nProvider';

type RegistryClub = {
  master_id: string;
  denominazione: string | null;
  regione: string | null;
  provincia: string | null;
  comune: string | null;
  is_claimed?: boolean | null;
  claimed_profile_id?: string | null;
  updated_at?: string | null;
};

type RegistryClaim = {
  id: string;
  claim_status: string;
  submitted_at: string | null;
  registry_master_id: string | null;
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

function RegistryNationalCard({ state }: { state: RegistryState }) {
  const { t } = useI18n();
  if (state.status === 'loading') {
    return (
      <section className="glass-panel border border-emerald-100 bg-emerald-50/60 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          {t('club.registry.eyebrow')}
        </p>
        <h2 className="heading-h2 mt-1 mb-2">{t('club.registry.loadingTitle')}</h2>
        <p className="text-sm text-emerald-950">
          {t('club.registry.loadingBody')}
        </p>
      </section>
    );
  }

  if (state.status === 'verified') {
    return (
      <section className="glass-panel border border-emerald-200 bg-emerald-50/80 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          {t('club.registry.eyebrow')}
        </p>
        <h2 className="heading-h2 mt-1 mb-2">{t('club.registry.verifiedTitle')}</h2>
        <p className="mb-4 text-sm text-emerald-950">
          {t('club.registry.verifiedBody')}
        </p>

        <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950">
          <p className="font-semibold">{state.club.denominazione || t('club.registry.linkedFallback')}</p>
          <p className="mt-1 text-xs text-emerald-800">
            {[state.club.regione, state.club.provincia, state.club.comune]
              .filter(Boolean)
              .join(' · ') || t('club.registry.locationFallback')}
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
          {t('club.registry.eyebrow')}
        </p>
        <h2 className="heading-h2 mt-1 mb-2">{t('club.registry.pendingTitle')}</h2>
        <p className="mb-4 text-sm text-yellow-950">
          {t('club.registry.pendingBody')}
        </p>

        <div className="rounded-xl border border-yellow-200 bg-white p-4 text-sm text-yellow-950">
          <p className="font-semibold">{club?.denominazione || t('club.registry.pendingFallback')}</p>
          <p className="mt-1 text-xs text-yellow-800">
            {[club?.regione, club?.provincia, club?.comune]
              .filter(Boolean)
              .join(' · ') || t('club.registry.locationFallback')}
          </p>
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="glass-panel border border-red-200 bg-red-50/80 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">
          {t('club.registry.eyebrow')}
        </p>
        <h2 className="heading-h2 mt-1 mb-2">{t('club.registry.errorTitle')}</h2>
        <p className="mb-4 text-sm text-red-950">{state.error}</p>
        <Link
          href="/club/registry-claim"
          className="inline-flex rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          {t('club.registry.errorAction')}
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel border border-emerald-100 bg-emerald-50/60 p-5 md:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        {t('club.registry.eyebrow')}
      </p>
      <h2 className="heading-h2 mt-1 mb-2">{t('club.registry.claimTitle')}</h2>
      <p className="mb-4 text-sm text-emerald-950">
        {t('club.registry.claimBody')}
      </p>
      <Link
        href="/club/registry-claim"
        className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        {t('club.registry.claimAction')}
      </Link>
    </section>
  );
}

export default function ProfilePage() {
  const { t } = useI18n();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [registryState, setRegistryState] = useState<RegistryState>({
    status: 'loading',
    club: null,
    claim: null,
    error: '',
  });

  useEffect(() => {
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
          .from('registry_clubs_master')
          .select('master_id, denominazione, regione, provincia, comune, is_claimed, claimed_profile_id, updated_at')
          .eq('claimed_profile_id', profileId)
          .eq('is_claimed', true)
          .order('updated_at', { ascending: false })
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
          .select('id, claim_status, submitted_at, registry_master_id')
          .eq('profile_id', profileId)
          .in('claim_status', ['pending', 'in_review', 'claim_pending'])
          .not('registry_master_id', 'is', null)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingClaimError) throw pendingClaimError;

        if (pendingClaim) {
          const claim = pendingClaim as RegistryClaim;

          let club: RegistryClub | null = null;

          if (claim.registry_master_id) {
            const { data: masterClub, error: masterClubError } = await supabase
              .from('registry_clubs_master')
              .select('master_id, denominazione, regione, provincia, comune, is_claimed, claimed_profile_id, updated_at')
              .eq('master_id', claim.registry_master_id)
              .maybeSingle();

            if (masterClubError) throw masterClubError;

            club = (masterClub as RegistryClub | null) ?? null;
          }

          if (!active) return;
          setRegistryState({
            status: 'pending',
            club,
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
          error: t('club.registry.errorBody'),
        });
      }
    }

    loadRegistryState();

    return () => {
      active = false;
    };
  }, [supabase, t]);

  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">{t('club.editTitle')}</h1>
      </header>

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">{t('club.data')}</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Compila o aggiorna le informazioni principali del club, inclusi foto profilo, località e impianto.
        </p>
        <ProfileEditForm />
      </section>

      <RegistryNationalCard state={registryState} />
    </main>
  );
}
