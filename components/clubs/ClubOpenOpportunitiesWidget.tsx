import Link from 'next/link';

type OpportunityItem = {
  id: string;
  title: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  created_at: string | null;
  status?: string | null;
  club_id?: string | null;
};

type Props = {
  items: OpportunityItem[];
  clubId: string;
  clubName?: string | null;
};

function formatLocation(opp: OpportunityItem) {
  const parts = [opp.city, opp.province, opp.region, opp.country].filter(Boolean);
  return parts.join(' · ') || 'Località non indicata';
}

function isNew(dateIso: string | null | undefined) {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  if (Number.isNaN(d.valueOf())) return false;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days <= 10;
}

export default function ClubOpenOpportunitiesWidget({ items, clubId, clubName }: Props) {
  const hasItems = items.length > 0;
  const viewAllHref = `/opportunities?clubId=${clubId}`;

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
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>Pubblicato il {opp.created_at ? new Date(opp.created_at).toLocaleDateString('it-IT') : '—'}</span>
                {isNew(opp.created_at) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Nuova</span>}
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

      <div className="mt-4 text-right">
        <Link
          href={viewAllHref}
          className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-blue-700 underline-offset-4 hover:bg-blue-50"
        >
          Vedi tutte le opportunità di {clubName || 'questo club'}
        </Link>
      </div>
    </section>
  );
}
