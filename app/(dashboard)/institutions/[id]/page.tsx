import { notFound } from 'next/navigation';

import type { ProfileLinks } from '@/types/profile';

import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
import ProfileHeader from '@/components/profiles/ProfileHeader';
import { buildClubDisplayName } from '@/lib/displayName';
import { getCountryName } from '@/lib/geo/countries';
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations';
import { getProvinceAbbreviationsServer } from '@/lib/geo/provinceAbbreviations.server';
import { resolveStateName } from '@/lib/geodata/countryStateCityDataset';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type PageProps = { params: Promise<{ id: string }> };

type InstitutionProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  display_name: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  bio: string | null;
  headline: string | null;
  avatar_url: string | null;
  role: string | null;
  account_type: string | null;
  type: string | null;
  links: ProfileLinks | null;
  club_foundation_year: number | null;
  club_stadium: string | null;
  club_stadium_address: string | null;
  club_stadium_lat: number | null;
  club_stadium_lng: number | null;
  club_motto: string | null;
};

function locationLabel(row: InstitutionProfileRow, provinceAbbreviations: Record<string, string>): string {
  const state = resolveStateName(row.country || null, row.region || row.province || '');
  const countryLabel = getCountryName(row.country || undefined) ?? (row.country || '');
  return [row.city, provinceDisplayValue(row.province, provinceAbbreviations), state, countryLabel]
    .filter(Boolean)
    .join(' · ');
}

export default async function InstitutionProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      [
        'id',
        'user_id',
        'full_name',
        'display_name',
        'city',
        'province',
        'region',
        'country',
        'bio',
        'headline',
        'avatar_url',
        'role',
        'account_type',
        'type',
        'links',
        'club_foundation_year',
        'club_stadium',
        'club_stadium_address',
        'club_stadium_lat',
        'club_stadium_lng',
        'club_motto',
      ].join(','),
    )
    .eq('id', id)
    .maybeSingle();

  const profile = (data ?? null) as InstitutionProfileRow | null;
  const accountType = String(profile?.account_type ?? profile?.type ?? '').toLowerCase();
  if (!profile || accountType !== 'institution') notFound();

  const { data: auth } = await supabase.auth.getUser();
  const meId = auth?.user?.id ?? null;
  const isMe = !!meId && (meId === profile.id || meId === profile.user_id);
  const provinceAbbreviations = await getProvinceAbbreviationsServer();
  const displayName = buildClubDisplayName(profile.full_name, profile.display_name, 'Ente');
  const location = locationLabel(profile, provinceAbbreviations);
  const aboutText = profile.bio || 'Nessuna descrizione disponibile.';
  const sede = location;
  const geolocation = [profile.club_stadium, profile.club_stadium_address].filter(Boolean).join(' · ');

  const headerLocationContent = (
    <div className="space-y-1">
      {location ? <p>{location}</p> : <p className="text-neutral-400">Località —</p>}
      {profile.club_motto ? <p className="text-sm italic text-neutral-700">“{profile.club_motto}”</p> : null}
      {profile.club_foundation_year ? (
        <p className="text-xs font-medium text-neutral-600">Anno di fondazione: {profile.club_foundation_year}</p>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 p-4 md:p-6">
      <ProfileHeader
        profileId={profile.id}
        displayName={displayName}
        accountType="institution"
        avatarUrl={profile.avatar_url}
        subtitle={profile.headline || 'Ente'}
        locationContent={headerLocationContent}
        socialLinks={profile.links ?? undefined}
        showMessageButton
        showFollowButton={!isMe}
      />

      <section className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">Dati ente</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Sede</div>
              <div className="mt-1 font-medium text-neutral-900">{sede || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Anno di fondazione</div>
              <div className="mt-1 font-medium text-neutral-900">{profile.club_foundation_year || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Localizzazione</div>
              <div className="mt-1 font-medium text-neutral-900">{geolocation || '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="heading-h2 text-xl">Biografia</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{aboutText}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading-h2 text-xl">Bacheca</h2>
          <span className="text-xs font-semibold text-blue-700">Aggiornamenti dell&apos;ente</span>
        </div>
        <PublicAuthorFeed authorId={profile.id} fallbackAuthorIds={profile.user_id ? [profile.user_id] : []} />
      </section>
    </div>
  );
}
