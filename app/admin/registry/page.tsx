"use client";

import { useState } from "react";

type RegistryDiscipline = {
  clubandplayer_sport: string;
  discipline_raw: string;
};

type RegistryClub = {
  id: string;
  source: string;
  source_club_id: string;
  name: string;
  normalized_name: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  claim_status: string;
  registry_club_disciplines: RegistryDiscipline[];
};

const SPORTS = [
  "",
  "Calcio",
  "Futsal",
  "Volley",
  "Basket",
  "Pallanuoto",
  "Pallamano",
  "Rugby",
  "Hockey su prato",
  "Hockey su ghiaccio",
  "Baseball",
  "Softball",
  "Lacrosse",
  "Football americano",
];

export default function AdminRegistryPage() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [sport, setSport] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RegistryClub[]>([]);
  const [error, setError] = useState("");

  async function search() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (query.trim()) params.set("q", query.trim());
      if (region.trim()) params.set("region", region.trim());
      if (province.trim()) params.set("province", province.trim());
      if (sport.trim()) params.set("sport", sport.trim());

      const res = await fetch(
        `/api/registry/clubs/search?${params.toString()}`
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Errore ricerca");
      }

      setResults(json.items || []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore imprevisto"
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-wide text-cyan-400">
            Admin Registry
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Registro Club CONI / FIGC
          </h1>

          <p className="mt-2 text-neutral-400">
            Ricerca interna per verificare club importati,
            discipline, territorio e stato claim.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-neutral-300">
                Nome club
              </label>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Es. Sporting, Juventus, Academy..."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Regione
              </label>

              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Es. Sicilia"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Provincia
              </label>

              <input
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Es. PA"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Sport
              </label>

              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-cyan-500"
              >
                <option value="">Tutti</option>
                {SPORTS.filter(Boolean).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={search}
                disabled={loading}
                className="w-full rounded-xl bg-cyan-600 px-5 py-3 font-semibold transition hover:bg-cyan-500 disabled:opacity-60"
              >
                {loading ? "Ricerca..." : "Cerca"}
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Risultati
            </h2>

            <span className="text-sm text-neutral-400">
              {results.length} club mostrati
            </span>
          </div>

          <div className="space-y-4">
            {results.map((club) => {
              const sports = Array.from(
                new Set(
                  club.registry_club_disciplines.map(
                    (discipline) =>
                      discipline.clubandplayer_sport
                  )
                )
              );

              return (
                <article
                  key={club.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">
                        {club.name}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-400">
                        ID CONI: {club.source_club_id} •{" "}
                        {club.region || "-"} •{" "}
                        {club.province || "-"} •{" "}
                        {club.municipality || "-"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {sports.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-cyan-700 bg-cyan-950/50 px-3 py-1 text-sm text-cyan-100"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <details className="mt-4 text-sm text-neutral-400">
                        <summary className="cursor-pointer text-neutral-300">
                          Discipline raw
                        </summary>

                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {club.registry_club_disciplines.map(
                            (discipline, index) => (
                              <li key={index}>
                                {discipline.discipline_raw} →{" "}
                                {
                                  discipline.clubandplayer_sport
                                }
                              </li>
                            )
                          )}
                        </ul>
                      </details>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <span className="rounded-full border border-yellow-700 bg-yellow-950/50 px-3 py-1 text-sm text-yellow-100">
                        {club.claim_status}
                      </span>

                      <button
                        type="button"
                        onClick={() => alert("Funzione in arrivo: questo pulsante servirà per collegare il tuo profilo Club a questa società del Registro.")}
                        className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                      >
                        Rivendicalo: sono io questo Club.
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}