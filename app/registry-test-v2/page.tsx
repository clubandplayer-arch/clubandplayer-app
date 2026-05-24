"use client";

import { useEffect, useState } from "react";

type RegistryClub = {
  master_id: string;
  denominazione: string;
  regione: string;
  provincia: string;
  comune: string;
  sport_normalizzati: string;
  is_claimed: boolean;
};

export default function RegistryTestV2Page() {
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState<RegistryClub[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = query.trim();

  useEffect(() => {
    const controller = new AbortController();

    async function search() {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (debouncedQuery) {
          params.set("q", debouncedQuery);
        }

        const res = await fetch(
          `/api/registry/master/search?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        const json = await res.json();

        if (json?.ok) {
          setClubs(json.results || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(() => {
  search();
}, 300);

return () => {
  controller.abort();
  clearTimeout(timeout);
};

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Registry Test V2
        </h1>

        <p className="text-sm text-neutral-500 mt-2">
          Dataset nazionale ASD/SSD safe.
        </p>
      </div>

      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca società..."
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      {loading && (
        <div className="mb-4 text-sm text-neutral-500">
          Caricamento...
        </div>
      )}

      <div className="grid gap-4">
        {clubs.map((club) => (
          <div
            key={club.master_id}
            className="border rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg">
                  {club.denominazione}
                </h2>

                <p className="text-sm text-neutral-500 mt-1">
                  {club.comune} ({club.provincia}) ·{" "}
                  {club.regione}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {club.sport_normalizzati
                    ?.split("|")
                    ?.filter(Boolean)
                    ?.map((sport) => (
                      <span
                        key={sport}
                        className="text-xs bg-neutral-100 rounded-full px-3 py-1"
                      >
                        {sport}
                      </span>
                    ))}
                </div>
              </div>

              <div>
                {club.is_claimed ? (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                    Claimed
                  </span>
                ) : (
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full">
                    Non reclamata
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}