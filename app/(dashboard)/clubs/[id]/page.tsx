// app/clubs/[id]/page.tsx
import { notFound } from 'next/navigation';

import type { ProfileLinks } from '@/types/profile';

import ProfileHeader from '@/components/profiles/ProfileHeader';
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations';
import { getProvinceAbbreviationsServer } from '@/lib/geo/provinceAbbreviations.server';
import ClubOpenOpportunitiesWidget from '@/components/clubs/ClubOpenOpportunitiesWidget';
import PublicClubRosterSection from '@/components/clubs/PublicClubRosterSection';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
import { buildClubDisplayName } from '@/lib/displayName';
import { normalizeSport } from '@/lib/opps/constants';

import { resolveStateName } from '@/lib/geodata/countryStateCityDataset';
import { getCountryName } from '@/lib/geo/countries';
import { getLatestOpenOpportunitiesByClub } from '@/lib/data/opportunities';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
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
  links: ProfileLinks;
  sport: string | null;
  club_league_category: string | null;
  club_foundation_year: number | null;
  club_stadium: string | null;
  club_stadium_address: string | null;
  club_motto: string | null;
  status: string | null;
  account_type: string | null;
  type: string | null;
  is_verified?: boolean | null;
};

type RegistryClubClaim = {
  id: string;
  source: string | null;
  source_club_id: string | null;
  name: string | null;
  fiscal_code: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  claimed_at: string | null;
};

type GenericStringError = { message: string };

const ENABLE_REGISTRY_CLAIM =
  process.env.NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM === 'true';

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
    'links',
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

async function loadClubVerificationStatus(clubId: string) {
  const adminClient = getSupabaseAdminClientOrNull();
  const supabase = adminClient ?? (await getSupabaseServerClient());
  const { data, error } = await supabase
    .from('club_verification_requests')
    .select('status, payment_status, verified_until, created_at')
    .eq('club_id', clubId)
    .eq('status', 'approved')
    .in('payment_status', ['paid', 'waived'])
    .gt('verified_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return Boolean(data);
}

async function loadRegistryClubClaim(profileId: string): Promise<RegistryClubClaim | null> {
  const adminClient = getSupabaseAdminClientOrNull();
  const supabase = adminClient ?? (await getSupabaseServerClient());

  const { data, error } = await supabase
    .from('registry_clubs')
    .select('id, source, source_club_id, name, fiscal_code, region, province, municipality, claimed_at')
    .eq('claimed_by_profile_id', profileId)
    .eq('claim_status', 'claimed')
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[registry-club] public profile lookup failed', error);
    return null;
  }

  return (data as RegistryClubClaim | null) ?? null;
}

function locationLabel(row: ClubProfileRow, provinceAbbreviations: Record<string, string>): string {
  const state = resolveStateName(row.country || null, row.region || row.province || '');
  const countryLabel = getCountryName(row.country || undefined) ?? (row.country || '');
  return [row.city, provinceDisplayValue(row.province, provinceAbbreviations), state, countryLabel]
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
  const isVerified = await loadClubVerificationStatus(profile.id);
  const registryClub = await loadRegistryClubClaim(profile.id);
  const profileWithVerification = { ...profile, is_verified: isVerified };

  const aboutText = profile.bio || 'Nessuna descrizione disponibile.';
  const provinceAbbreviations = await getProvinceAbbreviationsServer();
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

  const displayName = buildClubDisplayName(profileWithVerification.full_name, profileWithVerification.display_name, 'Club');
  const sportLabel = normalizeSport(profileWithVerification.sport ?? null) ?? profileWithVerification.sport ?? null;
  const subtitle =
    [profileWithVerification.club_league_category, sportLabel].filter(Boolean).join(' · ') || '—';
  const location = locationLabel(profileWithVerification, provinceAbbreviations) || undefined;
  const headerLocationContent = (
    <div className="space-y-1">
      {location ? <p>{location}</p> : <p className="text-neutral-400">Località —</p>}
      {profileWithVerification.club_motto ? (
        <p className="text-sm italic text-neutral-700">“{profileWithVerification.club_motto}”</p>
      ) : null}
      {profileWithVerification.club_foundation_year ? (
        <p className="text-xs font-medium text-neutral-600">
          Anno di fondazione: {profileWithVerification.club_foundation_year}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 p-4 md:p-6">
      <ProfileHeader
        profileId={profileWithVerification.id}
        displayName={displayName}
        accountType="club"
        avatarUrl={profileWithVerification.avatar_url}
        subtitle={subtitle}
        locationContent={headerLocationContent}
        socialLinks={profileWithVerification.links}
        showMessageButton
        showFollowButton={!isMe}
        isVerified={profileWithVerification.is_verified}
      />

      {ENABLE_REGISTRY_CLAIM && registryClub ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Registro CONI
              </p>
              <h2 className="mt-1 text-lg font-bold text-emerald-950">
                Registro CONI verificato
              </h2>
              <p className="mt-2 text-sm text-emerald-900">
                Questo Club ha rivendicato e collegato la propria società presente nel Registro CONI.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950">
              <p className="font-semibold">{registryClub.name || displayName}</p>
              <p className="mt-1 text-xs text-emerald-800">
                ID CONI: {registryClub.source_club_id || '—'}
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                {[registryClub.region, registryClub.province, registryClub.municipality]
                  .filter(Boolean)
                  .join(' · ') || 'Località —'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">Dati club</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Sede</div>
              <div className="mt-1 font-medium text-neutral-900">{locationLabel(profile, provinceAbbreviations) || '—'}</div>
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

      <PublicClubRosterSection clubId={clubProfileId} clubSport={profile.sport} clubCity={profile.city} />

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