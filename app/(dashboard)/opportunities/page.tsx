// app/(dashboard)/opportunities/page.tsx
import TrackListView from '@/components/analytics/TrackListView';

// ...tuo codice
export default async function Page(props: { searchParams?: Record<string, any> }) {
  const sp = props.searchParams || {};
  // adatta i nomi alle tue query reali:
  const filters = {
    q: sp.q ?? null,
    country: sp.country ?? null,
    region: sp.region ?? null,
    province: sp.province ?? null,
    city: sp.city ?? null,
    sport: sp.sport ?? null,
    role: sp.role ?? null,
    age: sp.age ?? null,
  };

  // se la lista è caricata server-side hai già i dati:
  // const items = await fetch(...) ...
  // const count = items.length;

  return (
    <>
      <TrackListView filters={filters} /* count={count} */ />
      {/* ...render della tua lista/filtri esistenti */}
    </>
  );
}
