'use client';

type Props = {
  openTo?: boolean | null;
  preferredRoles?: string | null;
  preferredLocations?: string | null;
};

export default function AthleteOpenToOpportunitiesPanel({ openTo, preferredLocations, preferredRoles }: Props) {
  if (!openTo && !preferredRoles && !preferredLocations) return null;

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${openTo ? 'border-emerald-200 bg-emerald-50' : 'bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="heading-h2 text-xl">Open to opportunities</h2>
        {openTo && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Disponibile
          </span>
        )}
      </div>
      {!openTo && <p className="mt-3 text-sm text-neutral-700">Non ha specificato disponibilità.</p>}
      {openTo && (
        <div className="mt-3 space-y-2 text-sm text-neutral-800">
          <div>
            <span className="font-semibold">Ruolo preferito:</span> {preferredRoles || '—'}
          </div>
          <div>
            <span className="font-semibold">Aree preferite:</span> {preferredLocations || '—'}
          </div>
        </div>
      )}
    </section>
  );
}
