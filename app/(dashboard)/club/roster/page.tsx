'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import useIsClub from '@/hooks/useIsClub';
import { resolveCountryName } from '@/lib/geodata/countryStateCityDataset';
import { countryCodeToFlagEmoji } from '@/lib/utils/flags';
import { buildRosterRoleSections } from '@/lib/utils/rosterRoleSort';

type ApiRosterPlayer = {
  playerProfileId?: string;
  player_profile_id?: string;
  player?: {
    id?: string;
    full_name?: string | null;
    display_name?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    sport?: string | null;
    role?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
    country?: string | null;
  };
};

type RosterPlayer = {
  id: string;
  name: string;
  fullName?: string | null;
  displayName?: string | null;
  avatarUrl: string | null;
  role: string | null;
  sport: string | null;
  city: string | null;
  countryCode: string | null;
  countryLabel: string | null;
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return 'PL';
  const parts = trimmed.split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]).join('');
  return initials.toUpperCase().padEnd(2, 'P');
}

export default function ClubRosterPage() {
  const { isClub, loading } = useIsClub();
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [clubSport, setClubSport] = useState<string | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    setError(null);
    try {
      const res = await fetch('/api/clubs/me/roster', { credentials: 'include', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || 'Errore nel caricare la rosa');

      const rosterRows = Array.isArray((json as any)?.roster) ? (json as any).roster : [];
      setClubSport((json as any)?.sport ?? null);
      const mapped: RosterPlayer[] = rosterRows
        .map((row: ApiRosterPlayer) => {
          const player = row?.player ?? {};
          const id = row?.playerProfileId || row?.player_profile_id || player?.id;
          if (!id) return null;
          const title = (player.full_name || '').trim() || (player.display_name || '').trim() || 'Profilo';
          return {
            id: String(id),
            name: title,
            fullName: player.full_name ?? null,
            displayName: player.display_name ?? null,
            avatarUrl: player.avatarUrl ?? player.avatar_url ?? null,
            role: player.role?.trim() || null,
            sport: player.sport ?? null,
            city: player.city?.trim() || null,
            countryCode: player.country && player.country.trim().length === 2 ? player.country.trim().toUpperCase() : null,
            countryLabel: player.country ? resolveCountryName(player.country) : null,
          } as RosterPlayer;
        })
        .filter(Boolean) as RosterPlayer[];

      setRoster(mapped);
    } catch (err: any) {
      setError(err?.message || 'Impossibile caricare la rosa');
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isClub) return;
    void loadRoster();
  }, [isClub, loading, loadRoster]);

  const rosterSections = useMemo(() => {
    return buildRosterRoleSections(roster, clubSport);
  }, [clubSport, roster]);
  const hasPlayers = rosterSections.length > 0;

  if (loading) {
    return <div className="p-6 text-sm text-neutral-600">Verifica permessi…</div>;
  }

  if (!isClub) {
    return (
      <div className="page-shell max-w-2xl rounded-xl border bg-yellow-50 p-4 text-yellow-900">
        Devi essere un <b>Club</b> per gestire la rosa.
        <div className="mt-2 text-sm text-yellow-800">
          Apri il tuo profilo club e assicurati di aver completato l&apos;onboarding come Club.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-sm font-semibold text-pink-700">
          <MaterialIcon name="following" fontSize={16} />
          <span>Rosa</span>
        </div>
        <h1 className="heading-h1">Rosa</h1>
        <p className="text-sm text-neutral-600">
          Qui trovi i player che hai aggiunto alla rosa del club. Usa il toggle &ldquo;In Rosa&rdquo; nella pagina dei
          seguiti per aggiungerli o rimuoverli in tempo reale.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loadingRoster ? (
        <div className="glass-panel p-4 text-sm text-neutral-700">Caricamento rosa…</div>
      ) : null}

      {!loadingRoster && !error && !hasPlayers ? (
        <div className="glass-panel space-y-2 p-5 text-sm text-neutral-700">
          <p className="font-semibold">Nessun player in rosa</p>
          <p>
            Vai nella sezione <Link href="/following" className="underline">Seguiti</Link> e attiva il toggle
            <span className="mx-1 rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">In Rosa</span>
            sui player che desideri aggiungere.
          </p>
        </div>
      ) : null}

      {!loadingRoster && hasPlayers ? (
        <div className="space-y-6">
          {rosterSections.map((section) => (
            <section key={section.roleLabel} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">{section.roleLabel}</h2>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.members.map((player) => (
                  <RosterPlayerCard key={player.id} player={player} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RosterPlayerCard({ player }: { player: RosterPlayer }) {
  const title = player.fullName?.trim() || player.displayName?.trim() || player.name || 'Profilo';
  const initials = getInitials(title);
  const [removing, setRemoving] = useState(false);
  const flag = player.countryCode ? countryCodeToFlagEmoji(player.countryCode) : null;

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await fetch('/api/clubs/me/roster', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerProfileId: player.id, inRoster: false }),
      });
    } catch {
      // silenzio: la lista verrà ricaricata manualmente
    } finally {
      setRemoving(false);
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/u/${player.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{title}</p>
          {player.role ? <p className="text-xs text-neutral-600">{player.role}</p> : null}
          {player.city ? <p className="text-xs text-neutral-600">{player.city}</p> : null}
          {player.countryLabel ? (
            <p className="flex items-center gap-1 text-xs text-neutral-600">
              {flag ? <span aria-hidden>{flag}</span> : null}
              <span>{player.countryLabel}</span>
            </p>
          ) : null}
        </div>
      </Link>
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className="text-xs font-semibold text-pink-700 hover:underline disabled:opacity-60"
      >
        {removing ? 'Rimozione…' : 'Rimuovi'}
      </button>
    </div>
  );
}
