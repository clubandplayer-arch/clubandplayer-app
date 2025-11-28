// app/clubs/[id]/page.tsx
import { notFound } from 'next/navigation';

import ClubProfileHeader from '@/components/clubs/ClubProfileHeader';
import ClubOpenOpportunitiesWidget from '@/components/clubs/ClubOpenOpportunitiesWidget';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';

import { resolveCountryName, resolveStateName } from '@/lib/geodata/countryStateCityDataset';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ClubProfileRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  full_name: string | null;
  headline: string | null;
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
  status: string | null;
  account_type: string | null;
  type: string | null;
};

type GenericStringError = { message: string };

type ClubProfileState = ClubProfileRow | GenericStringError | null;

function isClubProfileRow(row: ClubProfileState): row is ClubProfileRow {
  return !!row && typeof row === 'object' && 'account_type' in row;
}

type ClubOpportunityRow = {
  id: string;
  title: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  created_at: string | null;
};

async function loadClubProfile(id: string): Promise<ClubProfileRow | null> {
  const supabase = await getSupabaseServerClient();
  const select = [
    'id',
    'user_id',
    'display_name',
    'full_name',
    'headline',
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

  const { data: row, error } = await supabase
    .from('profiles')
    .select(select)
    .eq('id', id)
    .eq('status', 'active')
    .or('account_type.eq.club,type.eq.club')
    .maybeSingle();

  if (error) return null;

  const profileState = (row ?? null) as ClubProfileState;
  if (!isClubProfileRow(profileState)) return null;

  const accountType = (profileState.account_type || profileState.type || '').toLowerCase();
  if (accountType !== 'club') return null;

  return {
    ...profileState,
    user_id: profileState.user_id ?? null,
  };
}

async function loadClubOpportunities(id: string): Promise<ClubOpportunityRow[]> {
  const supabase = await getSupabaseServerClient();

  const ownerCandidates = [id];

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (profileRow?.user_id && !ownerCandidates.includes(profileRow.user_id)) {
    ownerCandidates.push(profileRow.user_id);
  }

  const { data } = await supabase
    .from('opportunities')
    .select('id, title, city, province, region, country, created_at, status, owner_id, club_id')
    .in('owner_id', ownerCandidates)
    .order('created_at', { ascending: false })
    .limit(5);

  const filtered = (data ?? []).filter((opp) => {
    const status = (opp as any).status ?? 'open';
    const clubId = (opp as any).club_id ?? null;
    const ownerId = (opp as any).owner_id ?? null;
    return status === 'open' && (!clubId || ownerCandidates.includes(clubId) || clubId === id) && ownerCandidates.includes(ownerId);
  });

  return filtered.map((opp) => ({
    id: opp.id,
    title: opp.title ?? null,
    city: (opp as any).city ?? null,
    province: (opp as any).province ?? null,
    region: (opp as any).region ?? null,
    country: (opp as any).country ?? null,
    created_at: (opp as any).created_at ?? null,
  }));
}

function locationLabel(row: ClubProfileRow): string {
  const state = resolveStateName(row.country || null, row.region || row.province || '');
  return [row.city, row.province, state, resolveCountryName(row.country || undefined)]
    .filter(Boolean)
    .join(' · ');
}

export default async function ClubPublicProfilePage({ params }: { params: { id: string } }) {
  const profile = await loadClubProfile(params.id);
  if (!profile) return notFound();

  const aboutText = profile.bio || 'Nessuna descrizione disponibile.';
  const opportunities = await loadClubOpportunities(profile.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <ClubProfileHeader profile={profile} />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="heading-h2 text-xl">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{aboutText}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">Dati club</h2>
          <dl className="mt-3 space-y-3 text-sm text-neutral-800">
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tipologia / Categoria</dt>
              <dd className="text-base font-semibold text-neutral-900">{profile.club_league_category || '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sport principale</dt>
              <dd className="text-base font-semibold text-neutral-900">{profile.sport || '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Impianto sportivo</dt>
              <dd className="text-base font-semibold text-neutral-900">{profile.club_stadium || '—'}</dd>
              <dd className="text-xs text-neutral-600">{profile.club_stadium_address || '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sede</dt>
              <dd className="text-base font-semibold text-neutral-900">{locationLabel(profile) || '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contatti</dt>
              <dd className="text-base font-semibold text-neutral-900">—</dd>
            </div>
          </dl>
        </div>
      </section>

      <ClubOpenOpportunitiesWidget items={opportunities} />

      <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading-h2 text-xl">Bacheca</h2>
          <span className="text-xs font-semibold text-blue-700">Aggiornamenti del club</span>
        </div>
        <PublicAuthorFeed
          authorId={profile.id}
          fallbackAuthorIds={profile.user_id ? [profile.user_id] : []}
        />
      </section>
    </div>
  );
}
