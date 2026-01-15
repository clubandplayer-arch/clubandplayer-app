"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { buildProfileDisplayName } from '@/lib/displayName';

type PublicRosterPlayer = {
  player_id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  city: string | null;
  country: string | null;
  country_iso2: string | null;
};

type PublicRosterResponse = {
  ok?: boolean;
  roster?: PublicRosterPlayer[];
};

type Props = {
  clubId: string;
};

function useCountryDisplay(player: PublicRosterPlayer) {
  return useMemo(() => {
    const rawCountry = (player.country ?? '').trim();
    const matchCountry = rawCountry.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
    const iso2 =
      player.country_iso2 ||
      (matchCountry ? matchCountry[1].trim().toUpperCase() : null);
    const label =
      (matchCountry ? matchCountry[2]?.trim() || iso2 || '' : rawCountry) || '';
    return { iso2, label };
  }, [player]);
}

function RosterCard({ player }: { player: PublicRosterPlayer }) {
  const displayName = buildProfileDisplayName(
    player.full_name,
    player.display_name,
    'Profilo',
  );
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const { iso2, label } = useCountryDisplay(player);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm">
      <Link
        href={`/u/${player.player_id}`}
        className="group flex min-w-0 flex-1 items-center gap-3"
      >
        {player.avatar_url ? (
          <Image
            src={player.avatar_url}
            alt={displayName}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700">
            {initials || '—'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 transition group-hover:text-pink-700">
            {displayName}
          </p>
          {player.role ? <p className="text-xs text-neutral-600">{player.role}</p> : null}
          {player.city ? <p className="text-xs text-neutral-600">{player.city}</p> : null}
          {label ? (
            <p className="flex items-center gap-1 text-xs text-neutral-600">
              {iso2 ? <CountryFlag iso2={iso2} /> : null}
              <span>{label}</span>
            </p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

function RosterSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/70 p-3">
      <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
        <div className="h-2 w-1/3 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}

export default function PublicClubRosterSection({ clubId }: Props) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PublicRosterPlayer[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadRoster() {
      try {
        setLoading(true);
        const res = await fetch(`/api/clubs/${clubId}/roster`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Roster fetch failed');
        const data = (await res.json().catch(() => ({}))) as PublicRosterResponse;
        if (!cancelled) {
          setPlayers(Array.isArray(data.roster) ? data.roster : []);
          setError(false);
        }
      } catch (err) {
        if (!cancelled) {
          setPlayers([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoster();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clubId]);

  return (
    <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h2 className="heading-h2 text-xl">Rosa</h2>
        <p className="text-sm text-neutral-600">Giocatori in rosa</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <RosterSkeleton />
          <RosterSkeleton />
        </div>
      ) : null}

      {!loading && (!players.length || error) ? (
        <p className="text-sm text-neutral-600">Nessun giocatore in rosa.</p>
      ) : null}

      {!loading && players.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {players.map((player) => (
            <RosterCard key={player.player_id} player={player} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
