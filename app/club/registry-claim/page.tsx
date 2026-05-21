"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RegistryClub = {
  id: string;
  source_club_id: string;
  name: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  claim_status: string;
  claimed_by_profile_id?: string | null;
  registry_club_disciplines: {
    clubandplayer_sport: string;
    discipline_raw: string;
  }[];
};

type ProfileRow = {
  id: string;
  account_type: string | null;
  type: string | null;
};

type RegistryClaimRow = {
  id: string;
  registry_club_id: string;
  claim_status: string;
};

type ClaimedClubOwnershipRow = {
  id: string;
  claimed_by_profile_id: string | null;
};

async function getCurrentClubProfileId() {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, account_type, type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  const row = profile as ProfileRow | null;
  const accountType = String(row?.account_type || row?.type || "").toLowerCase();

  if (!row?.id || accountType !== "club") return null;

  return row.id;
}

function normalizeRegistryClub(raw: RegistryClub): RegistryClub {
  return {
    ...raw,
    claimed_by_profile_id: raw.claimed_by_profile_id ?? null,
    registry_club_disciplines: Array.isArray(raw.registry_club_disciplines)
      ? raw.registry_club_disciplines
      : [],
  };
}

export default function ClubRegistryClaimPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState("");
  const [disputingId, setDisputingId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [results, setResults] = useState<RegistryClub[]>([]);
  const [message, setMessage] = useState("");
  const [currentClubProfileId, setCurrentClubProfileId] = useState<string | null>(null);

  async function enrichResultsWithOwnership(items: RegistryClub[]) {
    const supabase = getSupabaseBrowserClient();

    const profileId = await getCurrentClubProfileId();
    setCurrentClubProfileId(profileId);

    const normalized = items.map(normalizeRegistryClub);

    const claimedIds = normalized
      .filter((club) => club.claim_status === "claimed")
      .map((club) => club.id);

    const pendingIds = normalized.map((club) => club.id);

    let claimedByProfileByClubId = new Map<string, string | null>();
    let myPendingClaimClubIds = new Set<string>();

    if (claimedIds.length) {
      const { data: claimedRows, error: claimedError } = await supabase
        .from("registry_clubs")
        .select("id, claimed_by_profile_id")
        .in("id", claimedIds);

      if (claimedError) throw claimedError;

      claimedByProfileByClubId = new Map(
        ((claimedRows ?? []) as ClaimedClubOwnershipRow[]).map((row) => [
          String(row.id),
          row.claimed_by_profile_id ? String(row.claimed_by_profile_id) : null,
        ])
      );
    }

    if (profileId && pendingIds.length) {
      const { data: pendingRows, error: pendingError } = await supabase
        .from("registry_claims")
        .select("id, registry_club_id, claim_status")
        .eq("profile_id", profileId)
        .in("registry_club_id", pendingIds)
        .in("claim_status", ["pending", "in_review"]);

      if (pendingError) throw pendingError;

      myPendingClaimClubIds = new Set(
        ((pendingRows ?? []) as RegistryClaimRow[]).map((row) =>
          String(row.registry_club_id)
        )
      );
    }

    return normalized.map((club) => {
      const claimedByProfileId =
        claimedByProfileByClubId.get(club.id) ?? club.claimed_by_profile_id ?? null;

      if (myPendingClaimClubIds.has(club.id)) {
        return {
          ...club,
          claim_status: "claim_pending",
          claimed_by_profile_id: claimedByProfileId,
        };
      }

      return {
        ...club,
        claimed_by_profile_id: claimedByProfileId,
      };
    });
  }

  async function search() {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/registry/clubs/search?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Errore ricerca");
      }

      const enriched = await enrichResultsWithOwnership(json.items || []);
      setResults(enriched);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Errore imprevisto");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function claimClub(registryClubId: string) {
    setClaimingId(registryClubId);
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setMessage("Devi effettuare il login come Club per rivendicare una società.");
        return;
      }

      const res = await fetch("/api/registry/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registry_club_id: registryClubId,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Errore richiesta");
      }

      setMessage("Richiesta inviata. Il tuo Club è ora in verifica.");
      await search();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setClaimingId("");
    }
  }

  async function submitDispute(registryClubId: string) {
    setMessage("");

    try {
      const reason = disputeReason.trim();

      if (reason.length < 20) {
        setMessage("Inserisci una motivazione di almeno 20 caratteri.");
        return;
      }

      const supabase = getSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setMessage("Devi effettuare il login come Club per aprire un reclamo.");
        return;
      }

      const res = await fetch("/api/registry/claim-disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registry_club_id: registryClubId,
          reason,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Errore apertura reclamo");
      }

      setMessage(
        json.alreadyExists
          ? "Hai già un reclamo aperto per questa società."
          : "Reclamo inviato. Lo staff Club & Player lo prenderà in carico."
      );
      setDisputingId("");
      setDisputeReason("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Errore imprevisto");
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
          Cerca la tua ASD/SSD nel Registro CONI e collegala al tuo profilo Club.
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
              {loading ? "Ricerca..." : "Cerca"}
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
            const sports = Array.from(
              new Set(
                club.registry_club_disciplines.map(
                  (discipline) => discipline.clubandplayer_sport
                )
              )
            );

            const isPending = club.claim_status === "claim_pending";
            const isClaimed = club.claim_status === "claimed";
            const isClaimedByMe =
              isClaimed &&
              !!currentClubProfileId &&
              club.claimed_by_profile_id === currentClubProfileId;
            const isClaimedByOther = isClaimed && !isClaimedByMe;
            const isDisputeOpen = disputingId === club.id;

            return (
              <article
                key={club.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{club.name}</h2>

                    <p className="mt-1 text-sm text-neutral-400">
                      ID CONI: {club.source_club_id} • {club.region || "-"} •{" "}
                      {club.province || "-"} • {club.municipality || "-"}
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
                              onClick={() => submitDispute(club.id)}
                              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
                            >
                              Invia reclamo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDisputingId("");
                                setDisputeReason("");
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
                            setDisputingId(club.id);
                            setDisputeReason("");
                          }}
                          className="mt-3 rounded-lg border border-orange-600 px-3 py-1.5 text-xs font-semibold text-orange-100 hover:bg-orange-900/40"
                        >
                          Apri reclamo
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
                      onClick={() => claimClub(club.id)}
                      disabled={claimingId === club.id}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                    >
                      {claimingId === club.id ? "Invio..." : "Sono io questo Club"}
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