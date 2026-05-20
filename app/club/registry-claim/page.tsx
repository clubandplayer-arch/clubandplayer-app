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
  registry_club_disciplines: {
    clubandplayer_sport: string;
    discipline_raw: string;
  }[];
};

export default function ClubRegistryClaimPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState("");
  const [results, setResults] = useState<RegistryClub[]>([]);
  const [message, setMessage] = useState("");

  async function search() {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/registry/clubs/search?${params.toString()}`);
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Errore ricerca");
      }

      setResults(json.items || []);
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

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-cyan-400">
          Club Registry
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Rivendica la tua società
        </h1>

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

            return (
              <article
                key={club.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
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

                  <button
                    type="button"
                    onClick={() => claimClub(club.id)}
                    disabled={claimingId === club.id || isPending}
                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                  >
                    {isPending
                      ? "Richiesta già inviata"
                      : claimingId === club.id
                        ? "Invio..."
                        : "Sono io questo Club"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}