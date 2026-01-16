'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/common/FollowButton';
import useIsClub from '@/hooks/useIsClub';
import { buildProfileDisplayName } from '@/lib/displayName';
import ClubAvatarVerified from '@/components/ui/ClubAvatarVerified';

type FollowedProfile = {
  id: string;
  name: string;
  account_type: string | null;
  type?: string | null;
  avatar_url?: string | null;
  city: string | null;
  sport: string | null;
  role: string | null;
  is_verified?: boolean | null;
};

type ApiResponse = {
  items?: Array<{
    id: string;
    name?: string | null;
    account_type?: string | null;
    type?: string | null;
    avatar_url?: string | null;
    city?: string | null;
    country?: string | null;
    sport?: string | null;
    role?: string | null;
    is_verified?: boolean | null;
  }>;
};

type AccountType = 'club' | 'athlete';

function mapAccountType(value: string | null | undefined): AccountType {
  return value === 'club' ? 'club' : 'athlete';
}

function getInitials(value: string) {
  const clean = value.trim();
  if (!clean) return 'PR';
  const parts = clean.split(' ').filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

type FollowCardProps = {
  profile: FollowedProfile;
  type: AccountType;
  showRosterToggle: boolean;
  inRoster: boolean;
  rosterPending?: boolean;
  onToggleRoster?: (id: string, next: boolean) => void;
};

function FollowCard({ profile, type, showRosterToggle, inRoster, rosterPending, onToggleRoster }: FollowCardProps) {
  const href = type === 'club' ? `/c/${profile.id}` : `/u/${profile.id}`;
  const meta = [profile.city, profile.sport, profile.role].filter(Boolean).join(' · ');
  const initials = getInitials(profile.name || 'Profilo');
  const toggleDisabled = rosterPending || !onToggleRoster;
  const avatarUrl = profile.avatar_url ? profile.avatar_url.trim() : '';

  const handleToggle = () => {
    if (!onToggleRoster || toggleDisabled) return;
    onToggleRoster(profile.id, !inRoster);
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex flex-wrap items-start gap-3">
        <Link href={href} className="flex flex-1 gap-3">
          <ClubAvatarVerified
            src={avatarUrl || null}
            alt={profile.name || 'Profilo'}
            sizeClass="h-12 w-12"
            isVerified={type === 'club' && profile.is_verified}
            badgeSize="md"
            className="flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/40 text-sm font-semibold uppercase text-[var(--brand)] aspect-square rounded-full"
            imageClassName="object-cover"
            fallback={<span>{initials}</span>}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{profile.name}</p>
            </div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 truncate">{type === 'club' ? 'Club' : 'Player'}</p>
            {meta && <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{meta}</p>}
          </div>
        </Link>
      </div>

      <div className={`mt-auto flex items-center justify-between gap-3 ${showRosterToggle && type === 'athlete' ? 'rounded-lg border border-pink-100 bg-pink-50 px-3 py-2' : ''}`}>
        {showRosterToggle && type === 'athlete' ? (
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-pink-700">In Rosa</div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggleDisabled}
              role="switch"
              aria-checked={inRoster}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                inRoster ? 'bg-pink-500' : 'bg-neutral-300'
              } ${toggleDisabled ? 'opacity-60' : 'hover:opacity-90'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  inRoster ? 'translate-x-[18px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ) : (
          <div className="min-h-[24px]" aria-hidden="true" />
        )}
        <FollowButton targetProfileId={profile.id} size="sm" className="min-w-[96px] shrink-0" />
      </div>
    </div>
  );
}

export default function FollowingPage() {
  const [items, setItems] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rosterIds, setRosterIds] = useState<Set<string>>(new Set());
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [pendingRoster, setPendingRoster] = useState<Set<string>>(new Set());
  const { isClub, loading: roleLoading } = useIsClub();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/follows/list', { credentials: 'include', cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          throw new Error((data as any)?.error || 'Errore nel caricare i seguiti');
        }
        const mapped: FollowedProfile[] = Array.isArray(data.items)
          ? data.items.map((row) => ({
              id: row.id,
              name: buildProfileDisplayName(row.name, row.name, 'Profilo'),
              account_type: row.account_type ?? null,
              type: (row as any)?.type ?? null,
              city: row.city ?? null,
              sport: row.sport ?? null,
              role: row.role ?? null,
              avatar_url: row.avatar_url ?? null,
              is_verified: (row as any)?.is_verified ?? null,
            }))
          : [];
        setItems(mapped);
      } catch (err: any) {
        console.error('[following] errore caricamento', err);
        setError(err?.message || 'Errore nel caricare i seguiti');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const loadRoster = useCallback(async () => {
    if (!isClub) {
      setRosterIds(new Set());
      setRosterError(null);
      return;
    }
    setRosterLoading(true);
    setRosterError(null);
    try {
      const res = await fetch('/api/clubs/me/roster', { credentials: 'include', cache: 'no-store' });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((data as any)?.error || 'Errore nel caricare la rosa');
      const rosterRows = Array.isArray((data as any)?.roster) ? (data as any).roster : [];
      const ids = new Set<string>();
      rosterRows.forEach((row: any) => {
        const id = row?.playerProfileId || row?.player_profile_id || row?.player?.id;
        if (typeof id === 'string' && id.trim()) ids.add(id.trim());
      });
      setRosterIds(ids);
    } catch (err: any) {
      setRosterError(err?.message || 'Errore nel caricare la rosa');
      setRosterIds(new Set());
    } finally {
      setRosterLoading(false);
    }
  }, [isClub]);

  useEffect(() => {
    if (roleLoading) return;
    void loadRoster();
  }, [roleLoading, loadRoster]);

  const handleToggleRoster = useCallback(async (profileId: string, next: boolean) => {
    const cleanId = profileId.trim();
    if (!cleanId) return;
    setRosterError(null);
    setPendingRoster((curr) => new Set(curr).add(cleanId));
    setRosterIds((curr) => {
      const copy = new Set(curr);
      if (next) copy.add(cleanId);
      else copy.delete(cleanId);
      return copy;
    });

    try {
      const res = await fetch('/api/clubs/me/roster', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerProfileId: cleanId, inRoster: next }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.status === 409 && (data as any)?.code === 'PLAYER_ALREADY_IN_ROSTER') {
        setRosterError('Player già in rosa di un altro club. Deve essere rimosso prima.');
        setRosterIds((curr) => {
          const copy = new Set(curr);
          if (next) copy.delete(cleanId);
          else copy.add(cleanId);
          return copy;
        });
        return;
      }
      if (!res.ok) throw new Error((data as any)?.error || 'Errore nel salvare la rosa');

      const confirmed = (data as any)?.inRoster === false ? false : next;
      setRosterIds((curr) => {
        const copy = new Set(curr);
        if (confirmed) copy.add(cleanId);
        else copy.delete(cleanId);
        return copy;
      });
    } catch (err: any) {
      setRosterError(err?.message || 'Errore nel salvare la rosa');
      setRosterIds((curr) => {
        const copy = new Set(curr);
        if (next) copy.delete(cleanId);
        else copy.add(cleanId);
        return copy;
      });
    } finally {
      setPendingRoster((curr) => {
        const copy = new Set(curr);
        copy.delete(cleanId);
        return copy;
      });
    }
  }, []);

  const clubFollows = useMemo(() => items.filter((p) => mapAccountType(p.account_type) === 'club'), [items]);
  const playerFollows = useMemo(() => items.filter((p) => mapAccountType(p.account_type) === 'athlete'), [items]);
  const showRosterControls = isClub && !roleLoading;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="heading-h1">Club &amp; Player che segui</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Una panoramica di tutti i profili che hai deciso di seguire. {showRosterControls ? 'Come club puoi usare il toggle “In Rosa” per attivare la rosa dei player.' : ''}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {rosterError && showRosterControls ? <p className="text-sm text-red-600">{rosterError}</p> : null}
      {loading && <p className="text-sm text-neutral-600">Caricamento…</p>}
      {rosterLoading && showRosterControls ? <p className="text-xs text-pink-700">Aggiornamento stato “In Rosa”…</p> : null}

      {!loading && items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
          Non stai seguendo nessun profilo al momento. Visita un club o un player e clicca “Segui”.
        </div>
      ) : null}

      {clubFollows.length > 0 && (
        <section className="space-y-2">
          <h2 className="heading-h2 text-xl">Club che segui</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {clubFollows.map((profile) => (
              <FollowCard
                key={profile.id}
                profile={profile}
                type="club"
                showRosterToggle={false}
                inRoster={false}
              />
            ))}
          </div>
        </section>
      )}

      {playerFollows.length > 0 && (
        <section className="space-y-2">
          <h2 className="heading-h2 text-xl">Player che segui</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {playerFollows.map((profile) => (
              <FollowCard
                key={profile.id}
                profile={profile}
                type="athlete"
                showRosterToggle={showRosterControls}
                inRoster={rosterIds.has(profile.id)}
                rosterPending={pendingRoster.has(profile.id)}
                onToggleRoster={showRosterControls ? handleToggleRoster : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
