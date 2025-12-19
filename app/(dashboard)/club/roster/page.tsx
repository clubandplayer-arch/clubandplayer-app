'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import useIsClub from '@/hooks/useIsClub';

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
  location: string | null;
};

function buildLocation(row?: { city?: string | null; province?: string | null; region?: string | null; country?: string | null }) {
  if (!row) return null;
  const parts = [row.city, row.province || row.region, row.country]
    .map((value) => (value || '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

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
            role: player.role ?? null,
            sport: player.sport ?? null,
            location: buildLocation(player),
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

  const sortedRoster = useMemo(() => {
    const copy = [...roster];
    copy.sort((a, b) => {
      const na = (a.fullName || a.displayName || a.name || '').toLocaleLowerCase('it');
      const nb = (b.fullName || b.displayName || b.name || '').toLocaleLowerCase('it');
      return na.localeCompare(nb, 'it', { sensitivity: 'base' });
    });
    return copy;
  }, [roster]);
  const hasPlayers = sortedRoster.length > 0;

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRoster.map((player) => (
            <RosterPlayerCard key={player.id} player={player} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RosterPlayerCard({ player }: { player: RosterPlayer }) {
  const title = player.fullName?.trim() || player.displayName?.trim() || player.name || 'Profilo';
  const badge = [player.role, player.location].filter(Boolean).join(' · ') || '—';
  const initials = getInitials(title);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
        <p className="text-xs text-neutral-600">{badge}</p>
      </div>
      <Link href={`/u/${player.id}`} className="text-xs font-semibold text-[var(--brand)] hover:underline">
        Vedi profilo
      </Link>
    </div>
  );
}
