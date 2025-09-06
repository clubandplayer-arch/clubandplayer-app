import SearchInput from '@/components/controls/SearchInput';
import ClubsTable from '@/components/clubs/ClubsTable';
import Pagination from '@/components/pagination/Pagination';
import type { ClubsApiResponse } from '@/types/club';

export const metadata = {
  title: 'Clubs • ClubAndPlayer',
};

async function getClubs(searchParams: { [key: string]: string | string[] | undefined }) {
  const params = new URLSearchParams();

  if (typeof searchParams.q === 'string' && searchParams.q.trim()) {
    params.set('q', searchParams.q.trim());
  }
  if (typeof searchParams.page === 'string') {
    params.set('page', searchParams.page);
  }
  if (typeof searchParams.pageSize === 'string') {
    params.set('pageSize', searchParams.pageSize);
  }

  const res = await fetch(`/api/clubs?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load clubs: ${res.status}`);
  }

  return (await res.json()) as ClubsApiResponse;
}

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const data = await getClubs(searchParams);

  // ricostruisco i searchParams da inoltrare alla paginazione
  const sp = new URLSearchParams();
  if (typeof searchParams.q === 'string' && searchParams.q.trim()) {
    sp.set('q', searchParams.q.trim());
  }
  if (typeof searchParams.page === 'string') {
    sp.set('page', searchParams.page);
  }
  if (typeof searchParams.pageSize === 'string') {
    sp.set('pageSize', searchParams.pageSize);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clubs</h1>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchInput />
        {/* Qui in futuro potremo aggiungere pulsante "Nuovo club" */}
      </div>

      <ClubsTable items={data.data} />

      <Pagination page={data.page} pageCount={data.pageCount} searchParams={sp} />
    </div>
  );
}
