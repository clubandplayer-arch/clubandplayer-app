'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { PublicProfileSummary } from '@/lib/profiles/publicLookup';

type FollowRow = { target_id: string; target_type?: 'club' | 'player'; created_at?: string };

type CardProps = { profile: PublicProfileSummary; type: 'club' | 'player' };

function FollowCard({ profile, type }: CardProps) {
  const href = type === 'club' ? `/c/${profile.id}` : `/u/${profile.id}`;
  const name = profile.display_name || profile.full_name || 'Profilo';
  const meta = [profile.city, profile.sport, profile.role].filter(Boolean).join(' · ');
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/40 text-sm font-semibold uppercase text-[var(--brand)]">
          {name.substring(0, 2)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900">{name}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{type === 'club' ? 'Club' : 'Player'}</p>
        </div>
      </div>
      {meta && <p className="text-xs text-neutral-600">{meta}</p>}
    </Link>
  );
}

export default function FollowingPage() {
  const supabase = supabaseBrowser();
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PublicProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingTargetId, setMissingTargetId] = useState(false);
  const [missingTargetType, setMissingTargetType] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const alreadyLoaded = hasLoadedRef.current;
    setLoading((prev) => prev && !alreadyLoaded);
    setRefreshing(false);
    setError(null);
    const { data: userRes, error: authError } = await supabase.auth.getUser();
    if (authError || !userRes?.user) {
      setError('Devi accedere per vedere i profili che segui.');
      setLoading(false);
      setRefreshing(false);
      setFollows([]);
      setHasLoadedOnce(true);
      hasLoadedRef.current = true;
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('target_id, target_type, created_at')
        .eq('follower_id', userRes.user.id)
        .limit(400);
      if (error) throw error;
      const rows = (data || []) as FollowRow[];
      setFollows(rows);
      setMissingTargetId(false);
      setMissingTargetType(false);

      const ids = rows.map((r) => r.target_id).filter(Boolean);
      if (ids.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select(
            'id, user_id, display_name, full_name, headline, city, sport, role, avatar_url, account_type',
          )
          .in('id', ids);
        const map: Record<string, PublicProfileSummary> = {};
        (profilesData || []).forEach((row: any) => {
          const summary: PublicProfileSummary = {
            id: row.id,
            profile_id: row.id,
            user_id: row.user_id,
            display_name: row.display_name,
            full_name: row.full_name,
            headline: row.headline,
            city: row.city,
            sport: row.sport,
            role: row.role,
            avatar_url: row.avatar_url,
            account_type: row.account_type,
            first_name: null,
            last_name: null,
            bio: null,
            country: null,
            region: null,
            province: null,
          };
          map[row.id] = summary;
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (err: any) {
      const message = err?.message?.toString?.() || '';
      const missingColumn = /follows\.target_id/.test(message) && /does not exist/i.test(message);
      const missingType = /follows\.target_type/.test(message) && /does not exist/i.test(message);
      setMissingTargetId(missingColumn);
      setMissingTargetType(missingType);
      setError(
        missingColumn || missingType
          ? 'Colonne "target_id"/"target_type" mancanti su follows. Esegui il file supabase/migrations/20251018_fix_notifications_follows_post_reactions.sql.'
          : err?.message || 'Errore nel caricare i seguiti',
      );
      setFollows([]);
      setProfiles({});
    } finally {
      hasLoadedRef.current = true;
      setHasLoadedOnce(true);
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const clubFollows = useMemo(
    () => follows.filter((f) => f.target_type !== 'player'),
    [follows],
  );
  const playerFollows = useMemo(
    () => follows.filter((f) => f.target_type === 'player'),
    [follows],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="heading-h1">Club &amp; Player che segui</h1>
        <p className="text-sm text-neutral-600">Una panoramica di tutti i profili che hai deciso di seguire.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !hasLoadedOnce && <p className="text-sm text-neutral-600">Caricamento…</p>}
      {refreshing && hasLoadedOnce && (
        <p className="text-xs text-neutral-500">Aggiornamento in corso…</p>
      )}

      {!loading && !follows.length && !error && (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-sm text-neutral-600">
          Non stai seguendo nessun profilo al momento. Visita un club o un player e clicca “Segui”.
        </div>
      )}

      {!loading && !follows.length && error && (missingTargetId || missingTargetType) && (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-sm text-neutral-600">
          L’elenco dei seguiti richiede le colonne "target_id" e "target_type" sulla tabella follows. Aggiungile eseguendo il file supabase/migrations/20251018_fix_notifications_follows_post_reactions.sql.
        </div>
      )}

      {clubFollows.length > 0 && (
        <section className="space-y-2">
          <h2 className="heading-h2 text-xl">Club che segui</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {clubFollows.map((follow) => {
              const profile = profiles[follow.target_id];
              if (!profile) return null;
              return <FollowCard key={follow.target_id} profile={profile} type="club" />;
            })}
          </div>
        </section>
      )}

      {playerFollows.length > 0 && (
        <section className="space-y-2">
          <h2 className="heading-h2 text-xl">Player che segui</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {playerFollows.map((follow) => {
              const profile = profiles[follow.target_id];
              if (!profile) return null;
              return <FollowCard key={follow.target_id} profile={profile} type="player" />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
