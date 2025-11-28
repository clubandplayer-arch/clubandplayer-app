'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AthleteProfileHeader from '@/components/athletes/AthleteProfileHeader';
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
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

export default function AthletePublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfileRow | null>(null);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
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
        .from('profiles')
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
          ].join(','),
        )
        .eq('id', athleteId)
        .eq('status', 'active')
        .or('account_type.eq.athlete,type.eq.athlete')
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
      };

      setProfile(normalizedProfile);

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

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          <AthleteProfileHeader profile={profile} isMe={isMe} />

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
                <b>Sport:</b> {profile.sport ?? '—'}
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
