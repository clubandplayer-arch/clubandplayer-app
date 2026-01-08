'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AthleteExperiencesSection from '@/components/athletes/AthleteExperiencesSection';
import AthleteMediaHighlightsSection, {
  type AthleteMediaItem,
} from '@/components/athletes/AthleteMediaHighlightsSection';
import AthleteOpenToOpportunitiesPanel from '@/components/athletes/AthleteOpenToOpportunitiesPanel';
import AthleteStatsSection from '@/components/athletes/AthleteStatsSection';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
import ProfileHeader from '@/components/profiles/ProfileHeader';
import { buildPlayerDisplayName } from '@/lib/displayName';
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

type AthleteExperienceRow = {
  id: string;
  club_name: string | null;
  sport: string | null;
  role: string | null;
  category: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean | null;
  description: string | null;
};

function isAthleteExperienceRows(data: unknown): data is AthleteExperienceRow[] {
  return (
    Array.isArray(data) &&
    data.every((item) => item && typeof item === 'object' && 'id' in item && 'club_name' in item)
  );
}

export default function PlayerPublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfileRow | null>(null);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [experiences, setExperiences] = useState<AthleteExperienceRow[]>([]);
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

      const [expRes, mediaRes] = await Promise.all([
        supabase
          .from('athlete_experiences')
          .select(
            [
              'id',
              'club_name',
              'sport',
              'role',
              'category',
              'start_year',
              'end_year',
              'is_current',
              'description',
            ].join(','),
          )
          .eq('profile_id', normalizedProfile.id)
          .order('is_current', { ascending: false })
          .order('start_year', { ascending: false })
          .order('end_year', { ascending: false }),
        supabase
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
          .limit(6),
      ]);

      const experienceRows = isAthleteExperienceRows(expRes.data) ? expRes.data : [];
      setExperiences(experienceRows);
      setMedia((mediaRes.data as AthleteMediaItem[])?.slice(0, 3) ?? []);

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

  const sportLabel = useMemo(
    () => normalizeSport(profile?.sport ?? null) ?? profile?.sport ?? null,
    [profile?.sport],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
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
            showMessageButton
            showFollowButton={!isMe}
            messageLabel="Messaggia"
          />

          <AthleteOpenToOpportunitiesPanel
            openTo={profile.open_to_opportunities}
            preferredLocations={profile.preferred_locations}
            preferredRoles={profile.preferred_roles}
          />

          <AthleteExperiencesSection experiences={experiences} />

          <AthleteStatsSection
            matches={profile.matches_played}
            goals={profile.goals_scored}
            assists={profile.assists}
          />

          <AthleteMediaHighlightsSection items={media} />

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="heading-h2 text-xl">Bio</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {profile.bio && profile.bio.trim().length > 0 ? profile.bio : 'Nessuna bio disponibile.'}
            </p>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="heading-h2 text-xl">Panoramica</h2>
            <ul className="mt-3 space-y-1 text-sm text-neutral-800">
              <li>
                <b>Sport:</b> {sportLabel ?? '—'}
              </li>
              <li>
                <b>Ruolo:</b> {profile.role ?? '—'}
              </li>
              <li>
                <b>Città:</b> {profileLocation || '—'}
              </li>
            </ul>
          </section>

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
