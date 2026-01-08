// app/clubs/[id]/page.tsx
import { notFound } from 'next/navigation';

import ProfileHeader from '@/components/profiles/ProfileHeader';
import ClubOpenOpportunitiesWidget from '@/components/clubs/ClubOpenOpportunitiesWidget';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
import { buildClubDisplayName } from '@/lib/displayName';
import { normalizeSport } from '@/lib/opps/constants';

import { resolveStateName } from '@/lib/geodata/countryStateCityDataset';
import { getCountryName } from '@/lib/geo/countries';
import { getLatestOpenOpportunitiesByClub } from '@/lib/data/opportunities';
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
  status?: string | null;
  club_id?: string | null;
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

function locationLabel(row: ClubProfileRow): string {
  const state = resolveStateName(row.country || null, row.region || row.province || '');
  const countryLabel = getCountryName(row.country || undefined) ?? (row.country || '');
  return [row.city, row.province, state, countryLabel]
    .filter(Boolean)
    .join(' · ');
}

export default async function ClubPublicProfilePage({ params }: { params: { id: string } }) {
  const profile = await loadClubProfile(params.id);
  if (!profile) return notFound();

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth?.user?.id ?? null;
  const isMe = !!meId && (meId === profile.id || meId === profile.user_id);

  const aboutText = profile.bio || 'Nessuna descrizione disponibile.';
  const clubProfileId = profile.id;

  const opportunities: ClubOpportunityRow[] = (
    await getLatestOpenOpportunitiesByClub(clubProfileId, 3)
  ).map((opp) => ({
    id: opp.id,
    title: opp.title ?? null,
    city: opp.city ?? null,
    province: opp.province ?? null,
    region: opp.region ?? null,
    country: opp.country ?? null,
    created_at: opp.created_at ?? null,
    status: opp.status ?? null,
    club_id: (opp as any).club_id ?? null,
  }));

  const displayName = buildClubDisplayName(profile.full_name, profile.display_name, 'Club');
  const sportLabel = normalizeSport(profile.sport ?? null) ?? profile.sport ?? null;
  const subtitle = [profile.club_league_category, sportLabel].filter(Boolean).join(' · ') || '—';
  const location = locationLabel(profile) || undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <ProfileHeader
        profileId={profile.id}
        displayName={displayName}
        accountType="club"
        avatarUrl={profile.avatar_url}
        subtitle={subtitle}
        locationLabel={location}
        showMessageButton
        showFollowButton={!isMe}
      />

      <section className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">Dati club</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Sede</div>
              <div className="mt-1 font-medium text-neutral-900">{locationLabel(profile) || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Sport principale</div>
              <div className="mt-1 font-medium text-neutral-900">{sportLabel || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Tipologia / Categoria</div>
              <div className="mt-1 font-medium text-neutral-900">{profile.club_league_category || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Impianto sportivo</div>
              <div className="mt-1 font-medium text-neutral-900">{profile.club_stadium || '—'}</div>
              {profile.club_stadium_address && (
                <div className="text-xs text-neutral-600">{profile.club_stadium_address}</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">Biografia</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{aboutText}</p>
        </div>
      </section>

      <ClubOpenOpportunitiesWidget
        items={opportunities}
        clubId={clubProfileId}
        clubName={displayName}
      />

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
