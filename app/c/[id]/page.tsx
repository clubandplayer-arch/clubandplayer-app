import { notFound } from 'next/navigation';

type ClubProfile = {
  id: string;
  display_name?: string | null;
  bio?: string | null;
  city?: string | null;
  region?: string | null;
  account_type?: string | null;
  type?: string | null;
};

async function getClub(id: string): Promise<ClubProfile | null> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  const res = await fetch(`${base}/api/profiles/${id}`, {
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const j = await res.json().catch(() => ({}));
  const p = j?.data || j;
  if (!p) return null;

  const rawType =
    (p.account_type ?? p.type ?? '').toString().toLowerCase();
  if (!rawType.includes('club')) return null;

  return p as ClubProfile;
}

export default async function ClubPage({
  params,
}: {
  params: { id: string };
}) {
  const club = await getClub(params.id);
  if (!club) return notFound();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-2xl font-semibold">
          {club.display_name || 'Club'}
        </h1>
        {(club.city || club.region) && (
          <p className="mt-1 text-sm text-gray-600">
            {club.city}
            {club.city && club.region && ' · '}
            {club.region}
          </p>
        )}
        {club.bio && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
            {club.bio}
          </p>
        )}
      </section>
    </main>
  );
}
