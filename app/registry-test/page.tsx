export const dynamic = "force-dynamic";

export default function RegistryTestPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold">
          Registry Club Search
        </h1>

        <p className="mb-6 text-neutral-400">
          Test API: /api/registry/clubs/search?q=sporting
        </p>

        <a
          href="/api/registry/clubs/search?q=sporting"
          className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold"
        >
          Apri test API sporting
        </a>
      </div>
    </main>
  );
}