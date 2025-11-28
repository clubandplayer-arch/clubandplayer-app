import Link from 'next/link';

type OpportunityItem = {
  id: string;
  title: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  created_at: string | null;
};

type Props = {
  items: OpportunityItem[];
};

function formatLocation(opp: OpportunityItem) {
  const parts = [opp.city, opp.province, opp.region, opp.country].filter(Boolean);
  return parts.join(' · ') || 'Località non indicata';
}

export default function ClubOpenOpportunitiesWidget({ items }: Props) {
  const hasItems = items.length > 0;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="heading-h2 text-xl">Opportunità aperte</h2>
      {!hasItems && <p className="mt-3 text-sm text-neutral-700">Questo club non ha opportunità aperte al momento.</p>}
      {hasItems && (
        <ul className="mt-4 space-y-3">
          {items.map((opp) => (
            <li key={opp.id} className="rounded-xl border border-neutral-200 p-3">
              <div className="font-semibold text-neutral-900">{opp.title || 'Annuncio senza titolo'}</div>
              <div className="text-sm text-neutral-700">{formatLocation(opp)}</div>
              <div className="text-xs text-neutral-500">
                Pubblicato il {opp.created_at ? new Date(opp.created_at).toLocaleDateString() : '—'}
              </div>
              <Link
                href={`/opportunities/${opp.id}`}
                className="mt-2 inline-flex text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                Vai al dettaglio
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
