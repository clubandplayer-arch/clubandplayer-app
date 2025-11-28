// app/clubs/[id]/page.tsx
import Image from 'next/image';
import { notFound } from 'next/navigation';

import FollowButton from '@/components/clubs/FollowButton';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';

import { resolveCountryName, resolveStateName } from '@/lib/geodata/countryStateCityDataset';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ClubProfile = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  full_name: string | null;
  bio: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  avatar_url: string | null;
  sport: string | null;
  club_league_category: string | null;
  club_foundation_year: number | null;
  club_stadium: string | null;
  club_stadium_address: string | null;
  club_motto: string | null;
  status?: string | null;
  account_type?: string | null;
  type?: string | null;
};

async function loadClubProfile(id: string): Promise<ClubProfile | null> {
  const supabase = await getSupabaseServerClient();
  const select = [
    'id',
    'user_id',
    'display_name',
    'full_name',
    'bio',
    'country',
    'region',
    'province',
    'city',
    'avatar_url',
    'sport',
    'club_league_category',
    'club_foundation_year',
    'club_stadium',
    'club_stadium_address',
    'club_motto',
    'status',
    'account_type',
    'type',
  ].join(',');

  const { data: byId } = await supabase.from('profiles').select(select).eq('id', id).maybeSingle();
  const { data: byUser } = byId
    ? { data: null }
    : await supabase.from('profiles').select(select).eq('user_id', id).maybeSingle();

  const row = (byId || byUser) as ClubProfile | null;
  if (!row) return null;

  const accountType = (row.account_type || row.type || '').toLowerCase();
  if (accountType !== 'club') return null;
  if ((row.status ?? 'active') !== 'active') return null;

  return row;
}

function locationLabel(row: ClubProfile): string {
  const state = resolveStateName(row.country || null, row.region || row.province || '');
  return [row.city, row.province, state, resolveCountryName(row.country || undefined)]
    .filter(Boolean)
    .join(' · ');
}

export default async function ClubPublicProfilePage({ params }: { params: { id: string } }) {
  const profile = await loadClubProfile(params.id);
  if (!profile) return notFound();

  const name = profile.display_name || profile.full_name || 'Club';
  const place = locationLabel(profile);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200 md:h-32 md:w-32">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={name}
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="heading-h1 text-2xl md:text-3xl">{name}</h1>
              {place ? <p className="text-sm text-neutral-600">{place}</p> : null}
              {profile.club_motto ? <p className="text-sm italic text-neutral-700">{profile.club_motto}</p> : null}
            </div>
            <FollowButton
              id={profile.id}
              targetType="club"
              name={name}
              labelFollow="Segui"
              labelFollowing="Seguo"
              size="md"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Sport</div>
            <div className="text-base font-semibold text-neutral-900">{profile.sport || '—'}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Categoria</div>
            <div className="text-base font-semibold text-neutral-900">{profile.club_league_category || '—'}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Anno di fondazione</div>
            <div className="text-base font-semibold text-neutral-900">{profile.club_foundation_year || '—'}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Impianto</div>
            <div className="text-base font-semibold text-neutral-900">{profile.club_stadium || '—'}</div>
            <div className="text-xs text-neutral-600">{profile.club_stadium_address || ''}</div>
          </div>
        </div>

        {profile.bio ? (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Biografia</div>
            <p className="mt-1 text-sm leading-relaxed text-neutral-800 whitespace-pre-line">{profile.bio}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading-h2 text-xl">Bacheca</h2>
          <span className="text-xs font-semibold text-blue-700">Aggiornamenti del club</span>
        </div>
        <PublicAuthorFeed
          authorId={profile.user_id ?? profile.id}
          fallbackAuthorIds={profile.user_id ? [profile.id] : []}
        />
      </section>
    </div>
  );
}
