'use client';

import { useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type RegistryDiscipline = {
  clubandplayer_sport: string;
  discipline_raw: string;
};

type RegistryClub = {
  id: string;
  registry_master_id?: string;
  master_id?: string;
  source_club_id?: string;
  name: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  claim_status: string;
  claimed_by_profile_id?: string | null;
  registry_club_disciplines: RegistryDiscipline[];
};

type ProfileRow = {
  id: string;
  account_type: string | null;
  type: string | null;
};

type RegistryClaimRow = {
  id: string;
  registry_master_id: string | null;
  registry_club_id: string | null;
  claim_status: string;
};

async function getCurrentClubProfileId() {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, account_type, type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;

  const row = profile as ProfileRow | null;
  const accountType = String(row?.account_type || row?.type || '').toLowerCase();

  if (!row?.id || accountType !== 'club') return null;

  return row.id;
}

function getRegistryMasterId(club: RegistryClub) {
  return String(club.registry_master_id || club.master_id || club.id || '').trim();
}

function normalizeRegistryClub(raw: RegistryClub): RegistryClub {
  return {
    ...raw,
    id: getRegistryMasterId(raw),
    registry_master_id: getRegistryMasterId(raw),
    claimed_by_profile_id: raw.claimed_by_profile_id ?? null,
    registry_club_disciplines: Array.isArray(raw.registry_club_disciplines)
      ? raw.registry_club_disciplines
      : [],
  };
}

export default function ClubRegistryClaimPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState('');
  const [disputingId, setDisputingId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [results, setResults] = useState<RegistryClub[]>([]);
  const [message, setMessage] = useState('');
  const [currentClubProfileId, setCurrentClubProfileId] = useState<string | null>(null);

  async function enrichResultsWithOwnership(items: RegistryClub[]) {
    const supabase = getSupabaseBrowserClient();

    const profileId = await getCurrentClubProfileId();
    setCurrentClubProfileId(profileId);

    const normalized = items.map(normalizeRegistryClub);
    const masterIds = normalized.map((club) => getRegistryMasterId(club)).filter(Boolean);

    let myClaimByMasterId = new Map<string, RegistryClaimRow>();

    if (profileId && masterIds.length) {
      const { data: claimRows, error: claimError } = await supabase
        .from('registry_claims')
        .select('id, registry_master_id, registry_club_id, claim_status')
        .eq('profile_id', profileId)
        .in('registry_master_id', masterIds)
        .in('claim_status', ['pending', 'in_review', 'approved']);

      if (claimError) throw claimError;

      myClaimByMasterId = new Map(
        ((claimRows ?? []) as RegistryClaimRow[])
          .filter((row) => row.registry_master_id)
          .map((row) => [String(row.registry_master_id), row])
      );
    }

    return normalized.map((club) => {
      const registryMasterId = getRegistryMasterId(club);
      const myClaim = myClaimByMasterId.get(registryMasterId);

      if (myClaim?.claim_status === 'approved') {
        return {
          ...club,
          claim_status: 'claimed',
          claimed_by_profile_id: profileId,
        };
      }

      if (myClaim?.claim_status === 'pending' || myClaim?.claim_status === 'in_review') {
        return {
          ...club,
          claim_status: 'claim_pending',
          claimed_by_profile_id: null,
        };
      }

      return club;
    });
  }

  async function search() {
    setLoading(true);
    setMessage('');

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());

      const res = await fetch(`/api/registry/clubs/search?${params.toString()}`, {
        cache: 'no-store',
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Errore ricerca');
      }

      const enriched = await enrichResultsWithOwnership(json.items || []);
      setResults(enriched);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore imprevisto');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function claimClub(registryMasterId: string) {
    setClaimingId(registryMasterId);
    setMessage('');

    try {
      const supabase = getSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setMessage('Devi effettuare il login come Club per rivendicare una società.');
        return;
      }

      const res = await fetch('/api/registry/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registry_master_id: registryMasterId,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Errore richiesta');
      }

      setMessage('Richiesta inviata. Il tuo Club è ora in verifica.');
      await search();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setClaimingId('');
    }
  }

  async function submitDispute(registryMasterId: string) {
    setMessage('');

    try {
      const reason = disputeReason.trim();

      if (reason.length < 20) {
        setMessage('Inserisci una motivazione di almeno 20 caratteri.');
        return;
      }

      const supabase = getSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setMessage('Devi effettuare il login come Club per contestare una rivendicazione.');
        return;
      }

      const res = await fetch('/api/registry/claim-disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registry_master_id: registryMasterId,
          registry_club_id: registryMasterId,
          reason,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Errore apertura contestazione');
      }

      setMessage(
        json.alreadyExists
          ? 'Hai già una contestazione aperta per questa società.'
          : 'Contestazione inviata. Lo staff Club & Player la prenderà in carico.'
      );

      setDisputingId('');
      setDisputeReason('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore imprevisto');
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-cyan-400">
          Club Registry
        </p>

        <h1 className="mt-2 text-3xl font-bold">Rivendica la tua società</h1>

        <p className="mt-2 text-neutral-400">
          Cerca la tua ASD/SSD e collegala al tuo profilo Club.
        </p>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <label className="mb-2 block text-sm text-neutral-300">
            Nome società
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Es. Carlentini, Sporting, Academy..."
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-cyan-500"
            />

            <button
              type="button"
              onClick={search}
              disabled={loading}
              className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold hover:bg-cyan-500 disabled:opacity-60"
            >
              {loading ? 'Ricerca...' : 'Cerca'}
            </button>
          </div>

          {message ? (
            <p className="mt-4 rounded-xl border border-cyan-800 bg-cyan-950/40 p-3 text-sm text-cyan-100">
              {message}
            </p>
          ) : null}
        </section>

        <section className="mt-8 space-y-4">
          {results.map((club) => {
            const registryMasterId = getRegistryMasterId(club);

            const sports = Array.from(
              new Set(
                club.registry_club_disciplines
                  .map((discipline) => discipline.clubandplayer_sport)
                  .filter(Boolean)
              )
            );

            const isPending = club.claim_status === 'claim_pending';
            const isClaimed = club.claim_status === 'claimed';
            const isClaimedByMe =
              isClaimed &&
              !!currentClubProfileId &&
              club.claimed_by_profile_id === currentClubProfileId;
            const isClaimedByOther = isClaimed && !isClaimedByMe;
            const isDisputeOpen = disputingId === registryMasterId;

            return (
              <article
                key={registryMasterId}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{club.name}</h2>

                    <p className="mt-1 text-sm text-neutral-400">
                      {club.region || '-'} • {club.province || '-'} •{' '}
                      {club.municipality || '-'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {sports.map((sport) => (
                        <span
                          key={sport}
                          className="rounded-full border border-cyan-700 bg-cyan-950/50 px-3 py-1 text-sm text-cyan-100"
                        >
                          {sport}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isClaimedByMe ? (
                    <div className="rounded-xl border border-green-700 bg-green-950/50 px-4 py-3 text-sm text-green-100 md:max-w-64">
                      <p className="font-semibold">Club verificato</p>
                      <p className="mt-1 text-xs text-green-200/80">
                        Questa società è collegata al tuo profilo Club.
                      </p>
                    </div>
                  ) : isClaimedByOther ? (
                    <div className="rounded-xl border border-orange-700 bg-orange-950/50 px-4 py-3 text-sm text-orange-100 md:w-80">
                      <p className="font-semibold">Società già rivendicata</p>
                      <p className="mt-1 text-xs text-orange-200/80">
                        Questa società risulta già collegata ad un altro profilo Club.
                      </p>

                      {isDisputeOpen ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            placeholder="Spiega perché ritieni di avere diritto a rivendicare questa società..."
                            className="min-h-24 w-full rounded-lg border border-orange-700 bg-neutral-950 px-3 py-2 text-xs text-white outline-none focus:border-orange-400"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitDispute(registryMasterId)}
                              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
                            >
                              Invia contestazione
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDisputingId('');
                                setDisputeReason('');
                              }}
                              className="rounded-lg border border-orange-700 px-3 py-1.5 text-xs font-semibold text-orange-100 hover:bg-orange-900/40"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDisputingId(registryMasterId);
                            setDisputeReason(
                              'Sono il referente autorizzato di questa società e desidero contestare la rivendicazione attuale.'
                            );
                          }}
                          className="mt-3 rounded-lg border border-orange-600 px-3 py-1.5 text-xs font-semibold text-orange-100 hover:bg-orange-900/40"
                        >
                          Contesta rivendicazione
                        </button>
                      )}
                    </div>
                  ) : isPending ? (
                    <div className="rounded-xl border border-yellow-700 bg-yellow-950/50 px-4 py-3 text-sm text-yellow-100 md:max-w-64">
                      <p className="font-semibold">Verifica in corso</p>
                      <p className="mt-1 text-xs text-yellow-200/80">
                        Stiamo controllando la tua richiesta.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => claimClub(registryMasterId)}
                      disabled={claimingId === registryMasterId}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                    >
                      {claimingId === registryMasterId ? 'Invio...' : 'Sono io questo Club'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}