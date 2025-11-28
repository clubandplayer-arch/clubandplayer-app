'use client';

type Props = {
  matches?: number | null;
  goals?: number | null;
  assists?: number | null;
};

export default function AthleteStatsSection({ matches, goals, assists }: Props) {
  const hasStats = [matches, goals, assists].some((v) => (v ?? null) !== null && (v ?? 0) !== 0);

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="heading-h2 text-xl">Statistiche</h2>
      {!hasStats && <p className="mt-3 text-sm text-neutral-700">Statistiche non disponibili.</p>}
      {hasStats && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Partite" value={matches} />
          <StatCard label="Gol" value={goals} />
          <StatCard label="Assist" value={assists} />
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 text-center">
      <div className="text-sm uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold text-neutral-900">{value ?? '—'}</div>
    </div>
  );
}
