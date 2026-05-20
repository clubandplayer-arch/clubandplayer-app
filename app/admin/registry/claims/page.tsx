import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function RegistryClaimsAdminPage() {
  const supabase = getSupabaseAdmin();

  const { data: claims, error } = await supabase
    .from("registry_claims")
    .select(`
      id,
      claim_status,
      submitted_at,
      profile_id,
      registry_club_id,
      registry_clubs (
        name,
        source_club_id,
        region,
        province,
        municipality
      ),
      profiles (
        id,
        display_name,
        account_type
      )
    `)
    .eq("claim_status", "pending")
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-red-300">
            Errore caricamento richieste
          </h1>
          <pre className="mt-4 rounded-xl bg-red-950/50 p-4 text-sm text-red-100">
            {error.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-cyan-400">
          Admin Registry
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Richieste società in verifica
        </h1>

        <p className="mt-2 text-neutral-400">
          Approva o rifiuta le richieste dei Club che vogliono collegarsi al Registro CONI.
        </p>

        <section className="mt-8 space-y-4">
          {!claims?.length ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
              Nessuna richiesta in verifica.
            </div>
          ) : null}

          {claims?.map((claim) => {
            const registryClub = Array.isArray(claim.registry_clubs)
              ? claim.registry_clubs[0]
              : claim.registry_clubs;

            const profile = Array.isArray(claim.profiles)
              ? claim.profiles[0]
              : claim.profiles;

            return (
              <article
                key={claim.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="rounded-full border border-yellow-700 bg-yellow-950/50 px-3 py-1 text-xs font-semibold text-yellow-100">
                      Verifica in corso
                    </span>

                    <h2 className="mt-4 text-xl font-bold">
                      {registryClub?.name || "Società senza nome"}
                    </h2>

                    <p className="mt-1 text-sm text-neutral-400">
                      ID CONI: {registryClub?.source_club_id || "-"} •{" "}
                      {registryClub?.region || "-"} •{" "}
                      {registryClub?.province || "-"} •{" "}
                      {registryClub?.municipality || "-"}
                    </p>

                    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-sm text-neutral-400">
                        Profilo richiedente
                      </p>

                      <p className="mt-1 font-semibold">
                        {profile?.display_name || "Profilo senza nome"}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        Tipo account: {profile?.account_type || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-48">
                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white opacity-60"
                    >
                      Approva presto
                    </button>

                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-red-700 px-4 py-2 text-sm font-semibold text-red-200 opacity-60"
                    >
                      Rifiuta presto
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}