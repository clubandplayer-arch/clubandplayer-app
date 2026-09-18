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
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility';
import { resolveRequestLocale } from '@/lib/i18n/server';
import { loadMessages, type MessageKey } from '@/lib/i18n/messages';
import { localizeSport } from '@/lib/i18n/controlledVocabulary';
import { sportsOrganizationDisplayName } from '@/lib/sports/organizationDisplay';
import { localizeCountryOption } from '@/lib/i18n/countryDisplayName';
import { getProfileGeography, type ResidenceGeographyResolution } from '@/lib/geo/profileGeography';
import { SupabaseProfileGeographyRepository } from '@/lib/geo/profileGeography.server';

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
  master_id: string;
  denominazione: string | null;
  regione: string | null;
  provincia: string | null;
  comune: string | null;
  updated_at: string | null;
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

  const { data: row, error } = await applyPublicProfileVisibilityFilters(
    supabase.from('profiles').select(select),
  )
    .eq('id', id)
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
    .from('registry_clubs_master')
    .select('master_id, denominazione, regione, provincia, comune, updated_at')
    .eq('claimed_profile_id', profileId)
    .eq('is_claimed', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[registry-club] public profile lookup failed', error);
    return null;
  }

  return (data as RegistryClubClaim | null) ?? null;
}

function locationLabel(row: ClubProfileRow, provinceAbbreviations: Record<string, string>, locale: string, otherLabel: string): string {
  const state = resolveStateName(row.country || null, row.region || row.province || '');
  const rawCountry = row.country || '';
  const countryLabel = localizeCountryOption(rawCountry, getCountryName(rawCountry) ?? rawCountry, locale, otherLabel);
  return [row.city, provinceDisplayValue(row.province, provinceAbbreviations), state, countryLabel]
    .filter(Boolean)
    .join(' · ');
}

function canonicalLocationLabel(
  residence: ResidenceGeographyResolution | null,
  locale: string,
  otherLabel: string,
): string | null {
  if (!residence?.countryIso2) return null;
  const countryLabel = localizeCountryOption(
    residence.countryIso2,
    getCountryName(residence.countryIso2) ?? residence.countryIso2,
    locale,
    otherLabel,
  );
  const areas = residence.area
    ? [residence.area, ...[...residence.ancestors].reverse()].map((area) => area.officialName)
    : [];
  return [...areas, countryLabel].filter(Boolean).join(' · ');
}

async function loadPublicClubResidence(profileId: string): Promise<ResidenceGeographyResolution | null> {
  const client = getSupabaseAdminClientOrNull() ?? (await getSupabaseServerClient());
  try {
    return (await getProfileGeography(new SupabaseProfileGeographyRepository(client), profileId)).residence;
  } catch (error) {
    console.error('[club-profile] canonical residence lookup failed', error);
    return null;
  }
}

export default async function ClubPublicProfilePage({ params }: { params: { id: string } }) {
  const locale = await resolveRequestLocale();
  const messages = await loadMessages(locale);
  const t = (key: MessageKey) => messages[key] ?? key;
  const profile = await loadClubProfile(params.id);
  if (!profile) return notFound();

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth?.user?.id ?? null;
  const isMe = !!meId && (meId === profile.id || meId === profile.user_id);
  const isVerified = await loadClubVerificationStatus(profile.id);
  const registryClub = await loadRegistryClubClaim(profile.id);
  const canonicalResidence = await loadPublicClubResidence(profile.id);
  const profileWithVerification = { ...profile, is_verified: isVerified };

  const aboutText = profile.bio || t('club.noDescription');
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
  const sportLabel = localizeSport(normalizeSport(profileWithVerification.sport ?? null) ?? profileWithVerification.sport, t);
  const { data: registrations } = await supabase.from('club_sport_registrations')
    .select('id,is_primary,created_at,sports:sport_id(code,canonical_name),organization:sports_organization_id(code,canonical_name),category:sports_organization_category_id(canonical_name)')
    .eq('club_profile_id', profileWithVerification.id).eq('is_active', true)
    .order('is_primary', { ascending:false }).order('created_at');
  const primaryRegistration = registrations?.[0] as any;
  const { data: honors } = await supabase.from('club_honors')
    .select('id,season,placement,sports:sport_id(code,canonical_name),organization:sports_organization_id(code,canonical_name),category:sports_organization_category_id(canonical_name)')
    .eq('club_profile_id', profileWithVerification.id).eq('is_active', true)
    .order('season', { ascending: false }).order('placement').order('created_at').order('id');
  const primarySportLabel = primaryRegistration?.sports ? (localizeSport(primaryRegistration.sports.code, t) ?? primaryRegistration.sports.canonical_name) : sportLabel;
  const organizationLabel = primaryRegistration?.organization ? sportsOrganizationDisplayName(primaryRegistration.organization.code, primaryRegistration.organization.canonical_name) : null;
  const canonicalCategoryLabel = primaryRegistration?.category?.canonical_name ?? null;
  const subtitle =
    [primarySportLabel, organizationLabel, canonicalCategoryLabel].filter(Boolean).join(' · ') || '—';
  const location = canonicalLocationLabel(canonicalResidence, locale, t('vocabulary.category.other'))
    || locationLabel(profileWithVerification, provinceAbbreviations, locale, t('vocabulary.category.other'))
    || undefined;
  const headerLocationContent = (
    <div className="space-y-1">
      {location ? <p>{location}</p> : <p className="text-neutral-400">{t('profile.locationMissing')}</p>}
      {profileWithVerification.club_motto ? (
        <p className="text-sm italic text-neutral-700">“{profileWithVerification.club_motto}”</p>
      ) : null}
      {profileWithVerification.club_foundation_year ? (
        <p className="text-xs font-medium text-neutral-600">
          {t('club.foundationYear')}: {profileWithVerification.club_foundation_year}
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
                Registro Nazionale
              </p>
              <h2 className="mt-1 text-lg font-bold text-emerald-950">
                Registro Nazionale verificato
              </h2>
              <p className="mt-2 text-sm text-emerald-900">
                Questo Club ha rivendicato e collegato la propria società presente nel Registro Nazionale.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950">
              <p className="font-semibold">{registryClub.denominazione || displayName}</p>
              <p className="mt-1 text-xs text-emerald-800">
                {[registryClub.regione, registryClub.provincia, registryClub.comune]
                  .filter(Boolean)
                  .join(' · ') || 'Località —'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">{t('club.data')}</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">{t('club.headquarters')}</div>
              <div className="mt-1 font-medium text-neutral-900">{location || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">{t('club.sport')}</div>
              <div className="mt-1 font-medium text-neutral-900">{primarySportLabel || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">{t('club.organization')}</div>
              <div className="mt-1 font-medium text-neutral-900">{organizationLabel || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">{t('club.category')}</div>
              <div className="mt-1 font-medium text-neutral-900">{canonicalCategoryLabel || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">{t('club.facility')}</div>
              <div className="mt-1 font-medium text-neutral-900">{profile.club_stadium || '—'}</div>
              {profile.club_stadium_address && (
                <div className="text-xs text-neutral-600">{profile.club_stadium_address}</div>
              )}
            </div>
          </div>
        </div>

        {registrations?.length ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="heading-h2 text-xl">{t('club.registrations.title')}</h2><div className="mt-3 space-y-2">{registrations.map((r:any)=><div key={r.id} className="rounded-xl border p-3">{r.sports ? (localizeSport(r.sports.code, t) ?? r.sports.canonical_name) : '—'} · {r.organization ? sportsOrganizationDisplayName(r.organization.code,r.organization.canonical_name) : '—'} · {r.category?.canonical_name} {r.is_primary&&<b className="ml-2">{t('club.registrations.primary')}</b>}</div>)}</div></section> : null}

        {honors?.length ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="heading-h2 text-xl">{t('club.honors.title')}</h2><div className="mt-3 space-y-2">{honors.map((honor:any)=><div key={honor.id} className="rounded-xl border p-3">{honor.season} · {honor.sports ? (localizeSport(honor.sports.code, t) ?? honor.sports.canonical_name) : '—'} · {honor.organization ? sportsOrganizationDisplayName(honor.organization.code,honor.organization.canonical_name) : '—'} · {honor.category?.canonical_name ?? '—'} · <b>{honor.placement===1?t('club.honors.champion'):honor.placement===2?t('club.honors.place2'):t('club.honors.place3')}</b></div>)}</div></section> : null}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">{t('club.biography')}</h2>
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
          <h2 className="heading-h2 text-xl">{t('club.board')}</h2>
          <span className="text-xs font-semibold text-blue-700">{t('club.updates')}</span>
        </div>
        <PublicAuthorFeed
          authorId={profile.id}
          fallbackAuthorIds={profile.user_id ? [profile.user_id] : []}
        />
      </section>
    </div>
  );
}
