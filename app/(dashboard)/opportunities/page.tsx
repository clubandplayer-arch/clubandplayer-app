// app/(dashboard)/opportunities/page.tsx
import TrackListView from '@/components/analytics/TrackListView';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Page({ searchParams }: { searchParams?: SearchParams }) {
  const sp = searchParams ?? {};

  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? null;

  const filters = {
    q:        pick('q'),
    country:  pick('country'),
    region:   pick('region'),
    province: pick('province'),
    city:     pick('city'),
    sport:    pick('sport'),
    role:     pick('role'),
    age:      pick('age'),
  };

  // Se hai i dati lato server puoi passare anche count:
  // const items = await fetch(...);
  // const count = items.length;

  return (
    <>
      <TrackListView filters={filters} /* count={count} */ />
      {/* ...qui il render della lista/filtri esistenti */}
    </>
  );
}
