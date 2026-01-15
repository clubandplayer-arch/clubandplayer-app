'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AthleteMediaHighlightsSection, {
  type AthleteMediaItem,
} from '@/components/athletes/AthleteMediaHighlightsSection';
import AthleteOpenToOpportunitiesPanel from '@/components/athletes/AthleteOpenToOpportunitiesPanel';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
import ProfileHeader from '@/components/profiles/ProfileHeader';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import { normalizeSport } from '@/lib/opps/constants';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type AthleteProfileRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  sport: string | null;
  role: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  avatar_url: string | null;
  account_type: string | null;
  status: string | null;
  matches_played: number | null;
  goals_scored: number | null;
  assists: number | null;
  open_to_opportunities: boolean | null;
  preferred_roles: string | null;
  preferred_locations: string | null;
};

type GenericStringError = { message: string };

type AthleteProfileState = AthleteProfileRow | GenericStringError | null;

function isAthleteProfileRow(row: AthleteProfileState): row is AthleteProfileRow {
  return !!row && typeof row === 'object' && 'account_type' in row;
}

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  opportunity_id: string;
  opportunity?: {
    title: string;
    club_name: string;
    city: string;
  };
};

type ClubMembershipRow = {
  club_profile_id: string | null;
  club_sport: string | null;
  created_at: string | null;
  status: string | null;
};

type ClubProfileSummary = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  club_league_category: string | null;
  country: string | null;
  account_type: string | null;
  type: string | null;
  status: string | null;
};

function isClubProfileSummary(row: unknown): row is ClubProfileSummary {
  return !!row && typeof row === 'object' && 'id' in row;
}

function getInitials(name: string) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'CL';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PlayerPublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfileRow | null>(null);
  const [clubOfBelonging, setClubOfBelonging] = useState<ClubProfileSummary | null>(null);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [media, setMedia] = useState<AthleteMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg('');

      const athleteId = params.id;
      if (!athleteId) {
        router.replace('/');
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes?.user?.id ?? null;
      setMeId(currentUserId);

      const { data: profileRow, error } = await supabase
        .from('players_view')
        .select(
          [
            'id',
            'user_id',
            'display_name',
            'full_name',
            'headline',
            'bio',
            'sport',
            'role',
            'country',
            'region',
            'province',
            'city',
            'avatar_url',
            'account_type',
            'status',
            'matches_played',
            'goals_scored',
            'assists',
            'open_to_opportunities',
            'preferred_roles',
            'preferred_locations',
          ].join(','),
        )
        .eq('id', athleteId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        setMsg(error.message || 'Profilo non trovato.');
        setLoading(false);
        return;
      }

      const profileState = (profileRow ?? null) as AthleteProfileState;

      if (!isAthleteProfileRow(profileState)) {
        setMsg(profileState?.message || 'Profilo non trovato.');
        setLoading(false);
        return;
      }

      const accountType = (profileState.account_type || '').toLowerCase();
      if (accountType !== 'athlete') {
        setMsg('Profilo non trovato.');
        setLoading(false);
        return;
      }

      const normalizedProfile: AthleteProfileRow = {
        ...profileState,
        user_id: profileState.user_id ?? null,
        matches_played: profileState.matches_played ?? null,
        goals_scored: profileState.goals_scored ?? null,
        assists: profileState.assists ?? null,
        preferred_roles: profileState.preferred_roles ?? null,
        preferred_locations: profileState.preferred_locations ?? null,
      };

      setProfile(normalizedProfile);

      try {
        const { data: rosterRows, error: rosterError } = await supabase
          .from('club_roster_members')
          .select('club_profile_id, club_sport, created_at, status')
          .eq('player_profile_id', normalizedProfile.id)
          .eq('status', 'active');

        if (rosterError) {
          setClubOfBelonging(null);
        } else {
          const rows = (rosterRows ?? []) as ClubMembershipRow[];
          if (rows.length === 0) {
            setClubOfBelonging(null);
          } else {
            const normalizedPlayerSport =
              normalizeSport(normalizedProfile.sport ?? null) ?? normalizedProfile.sport ?? null;
            const matchingSport = normalizedPlayerSport
              ? rows.filter((row) => {
                  const rowSport = normalizeSport(row.club_sport ?? null) ?? row.club_sport ?? null;
                  return rowSport === normalizedPlayerSport;
                })
              : [];
            const candidates = matchingSport.length > 0 ? matchingSport : rows;
            const sorted = [...candidates].sort((a, b) => {
              const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bDate - aDate;
            });
            const chosenClubId = sorted[0]?.club_profile_id ?? null;

            if (chosenClubId) {
              const { data: clubProfile, error: clubError } = await supabase
                .from('profiles')
                .select(
                  [
                    'id',
                    'full_name',
                    'display_name',
                    'avatar_url',
                    'sport',
                    'club_league_category',
                    'country',
                    'account_type',
                    'type',
                    'status',
                  ].join(','),
                )
                .eq('id', chosenClubId)
                .eq('status', 'active')
                .maybeSingle();

              if (clubError || !isClubProfileSummary(clubProfile)) {
                setClubOfBelonging(null);
              } else {
                const accountType = String(clubProfile.account_type ?? clubProfile.type ?? '').toLowerCase();
                if (accountType !== 'club') {
                  setClubOfBelonging(null);
                } else {
                  setClubOfBelonging(clubProfile);
                }
              }
            } else {
              setClubOfBelonging(null);
            }
          }
        }
      } catch {
        setClubOfBelonging(null);
      }

      const { data: mediaRes } = await supabase
        .from('posts')
        .select('id, media_url, media_type, created_at')
        .not('media_url', 'is', null)
        .in(
          'author_id',
          normalizedProfile.user_id && normalizedProfile.user_id !== normalizedProfile.id
            ? [normalizedProfile.id, normalizedProfile.user_id]
            : [normalizedProfile.id],
        )
        .order('created_at', { ascending: false })
        .limit(6);

      setMedia((mediaRes as AthleteMediaItem[])?.slice(0, 3) ?? []);

      if (currentUserId && (currentUserId === normalizedProfile.user_id || currentUserId === normalizedProfile.id)) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('id, created_at, status, opportunity_id')
          .eq('athlete_id', normalizedProfile.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const appsTyped = (appsData ?? []) as ApplicationRow[];

        if (appsTyped.length > 0) {
          const oppIds = Array.from(new Set(appsTyped.map((a) => a.opportunity_id)));
          const { data: opps } = await supabase
            .from('opportunities')
            .select('id, title, club_name, city')
            .in('id', oppIds);
          const oppMap = new Map<string, ApplicationRow['opportunity']>();
          (opps ?? []).forEach((o) => oppMap.set(o.id, { ...o }));
          setApps(
            appsTyped.map((a) => ({
              ...a,
              opportunity: oppMap.get(a.opportunity_id) ?? a.opportunity,
            })),
          );
        } else {
          setApps([]);
        }
      } else {
        setApps([]);
      }

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const isMe = useMemo(() => !!meId && !!profile && (meId === profile.user_id || meId === profile.id), [meId, profile]);

  const profileLocation = useMemo(() => {
    if (!profile) return '';
    const parts = [profile.city, profile.province, profile.region, profile.country]
      .map((part) => (part ?? '').trim())
      .filter(Boolean);
    return parts.join(' · ');
  }, [profile]);

  const profileLocationBase = useMemo(() => {
    if (!profile) return '';
    const parts = [profile.city, profile.province, profile.region]
      .map((part) => (part ?? '').trim())
      .filter(Boolean);
    return parts.join(' · ');
  }, [profile]);

  const headerDisplayName = useMemo(() => {
    if (!profile) return 'Player';
    return buildPlayerDisplayName(profile.full_name, profile.display_name);
  }, [profile]);

  const headerSubtitle = useMemo(() => {
    if (!profile) return '';
    const sportLabel = normalizeSport(profile.sport ?? null) ?? profile.sport ?? null;
    const parts = [profile.role, sportLabel].filter(Boolean);
    return parts.join(' · ') || '—';
  }, [profile]);

  const clubDisplayName = useMemo(() => {
    if (!clubOfBelonging) return null;
    return buildClubDisplayName(clubOfBelonging.full_name, clubOfBelonging.display_name, 'Club');
  }, [clubOfBelonging]);

  const clubSubtitle = useMemo(() => {
    if (!clubOfBelonging) return null;
    const normalizedClubSport =
      normalizeSport(clubOfBelonging.sport ?? null) ?? clubOfBelonging.sport ?? null;
    return [clubOfBelonging.club_league_category, normalizedClubSport].filter(Boolean).join(' · ') || null;
  }, [clubOfBelonging]);

  const clubCountry = useMemo(() => {
    if (!clubOfBelonging?.country) return { iso2: null, label: '' };
    const raw = clubOfBelonging.country.trim();
    const match = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
    const iso2 = match ? match[1].trim().toUpperCase() : null;
    const label = (match ? (match[2]?.trim() || iso2 || '') : raw) || '';
    return { iso2, label };
  }, [clubOfBelonging?.country]);

  const headerCountry = useMemo(() => {
    const raw = (profile?.country ?? '').trim();
    if (!raw) return { iso2: null, label: '' };
    const match = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
    const iso2 = match ? match[1].trim().toUpperCase() : raw.toUpperCase();
    const label = (match ? (match[2]?.trim() || iso2 || '') : raw) || '';
    return { iso2, label };
  }, [profile?.country]);

  const headerLocationContent = useMemo(() => {
    const rawLocation = profileLocationBase.trim();
    const countryLabel = headerCountry.label || (headerCountry.iso2 ? headerCountry.iso2.toUpperCase() : '');
    if (!rawLocation && !countryLabel) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        {rawLocation ? <span>{rawLocation}</span> : null}
        {countryLabel ? (
          <span className="inline-flex items-center gap-2">
            <CountryFlag iso2={headerCountry.iso2} />
            <span>{countryLabel}</span>
          </span>
        ) : null}
      </div>
    );
  }, [headerCountry.iso2, headerCountry.label, profileLocationBase]);

  return (
    <main className="mx-auto min-w-0 max-w-5xl space-y-6 px-4 py-6">
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          <ProfileHeader
            profileId={profile.id}
            displayName={headerDisplayName}
            accountType="player"
            avatarUrl={profile.avatar_url}
            subtitle={headerSubtitle}
            locationLabel={profileLocation}
            locationContent={headerLocationContent}
            showMessageButton
            showFollowButton={!isMe}
            messageLabel="Messaggia"
          />

          {clubOfBelonging && clubDisplayName ? (
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Club di appartenenza</h2>
              <Link
                href={`/clubs/${clubOfBelonging.id}`}
                className="mt-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/80 p-3 transition hover:border-pink-200 hover:bg-pink-50/40"
              >
                {clubOfBelonging.avatar_url ? (
                  <Image
                    src={clubOfBelonging.avatar_url}
                    alt={clubDisplayName}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-100 text-xs font-semibold text-pink-700">
                    {getInitials(clubDisplayName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-neutral-900">{clubDisplayName}</p>
                    {clubCountry.iso2 ? <CountryFlag iso2={clubCountry.iso2} /> : null}
                  </div>
                  {clubSubtitle ? (
                    <p className="text-xs text-neutral-600">{clubSubtitle}</p>
                  ) : clubCountry.label ? (
                    <p className="text-xs text-neutral-600">{clubCountry.label}</p>
                  ) : null}
                </div>
              </Link>
            </section>
          ) : null}

          <AthleteOpenToOpportunitiesPanel
            openTo={profile.open_to_opportunities}
            preferredLocations={profile.preferred_locations}
            preferredRoles={profile.preferred_roles}
          />

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="heading-h2 text-xl">Bio</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {profile.bio && profile.bio.trim().length > 0 ? profile.bio : 'Nessuna bio disponibile.'}
            </p>
          </section>

          <AthleteMediaHighlightsSection items={media} />

          <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="heading-h2 text-xl">Bacheca</h2>
              <span className="text-xs font-semibold text-blue-700">Aggiornamenti del player</span>
            </div>
            <PublicAuthorFeed authorId={profile.id} fallbackAuthorIds={profile.user_id ? [profile.user_id] : []} />
          </section>

          {isMe && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="heading-h2 text-xl">Le mie ultime candidature</h2>
              {apps.length === 0 ? (
                <p className="text-sm text-neutral-700">Nessuna candidatura recente.</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {apps.map((a) => (
                    <li key={a.id} className="rounded-xl border border-neutral-200 p-3">
                      <div className="font-semibold">{a.opportunity?.title ?? 'Annuncio'}</div>
                      <div className="text-sm text-neutral-600">
                        {a.opportunity?.club_name ?? '—'} — {a.opportunity?.city ?? '—'}
                      </div>
                      <div className="text-[12px] text-neutral-500">
                        Stato: {a.status} · {new Date(a.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/opportunities" className="text-blue-700 underline-offset-4 hover:underline">
              ← Torna alle opportunità
            </Link>
            <Link href="/favorites" className="text-blue-700 underline-offset-4 hover:underline">
              I miei preferiti
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
