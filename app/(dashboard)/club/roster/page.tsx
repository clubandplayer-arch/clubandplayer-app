'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import useIsClub from '@/hooks/useIsClub';
import { buildProfileDisplayName } from '@/lib/displayName';

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
  avatarUrl: string | null;
  role: string | null;
  sport: string | null;
  location: string | null;
};

const SPORT_ROLE_GROUPS: Record<string, string[]> = {
  calcio: ['Portieri', 'Difensori', 'Centrocampisti', 'Attaccanti'],
  basket: ['Playmaker', 'Guardia', 'Ala', 'Centro'],
  rugby: ['Prima linea', 'Seconda linea', 'Terza linea', 'Mediani', 'Trequarti', 'Estremi'],
};

function capitalizeRole(role?: string | null) {
  if (!role) return 'Ruolo non specificato';
  const value = role.trim();
  if (!value) return 'Ruolo non specificato';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeRole(input?: string | null) {
  return (input ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function footballBucketFromRole(role?: string | null) {
  const r = normalizeRole(role);
  if (!r) return 'Ruolo non specificato';
  const has = (...parts: string[]) => parts.some((p) => r.includes(p));

  // PORTIERI
  if (has('portiere', 'goalkeeper', 'keeper', 'gk')) return 'Portieri';

  // ATTACCANTI (PRIMA: evita che “punta centrale” venga confusa)
  if (
    has(
      'punta',
      'punta centrale',
      'centravanti',
      'seconda punta',
      'attaccante',
      'ala',
      'esterno offensivo',
      'forward',
      'striker',
      'winger',
      'st',
      'cf',
    )
  ) {
    return 'Attaccanti';
  }

  // DIFENSORI
  if (
    has(
      'difensore',
      'terzino',
      'difesa',
      'difensore centrale',
      'centrale difensivo',
      'stopper',
      'braccetto',
      'cb',
      'rb',
      'lb',
      'wingback',
      'fullback',
      'wb',
    )
  ) {
    return 'Difensori';
  }

  // CENTROCAMPISTI (SOLO “centrocamp*”, non “centro”)
  if (has('centrocamp', 'mediano', 'regista', 'mezzala', 'interno', 'mf', 'cm', 'cdm', 'cam')) {
    return 'Centrocampisti';
  }

  return 'Ruolo non specificato';
}

function resolveRoleGroup(sport: string | null, role: string | null) {
  const normalizedSport = String(sport ?? '').trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (['calcio', 'soccer', 'football'].includes(normalizedSport)) {
    return footballBucketFromRole(role);
  }

  if (!normalizedRole) return 'Ruolo non specificato';

  if (['calcio', 'soccer', 'football'].includes(normalizedSport)) {
    if (normalizedRole.includes('portier')) return 'Portieri';
    if (normalizedRole.includes('difens')) return 'Difensori';
    if (normalizedRole.includes('centr') || normalizedRole.includes('mid') || normalizedRole.includes('mezz')) {
      return 'Centrocampisti';
    }
    if (normalizedRole.includes('attacc') || normalizedRole.includes('punta') || normalizedRole.includes('forward')) {
      return 'Attaccanti';
    }
  }

  if (normalizedSport === 'basket' || normalizedSport === 'basketball') {
    if (normalizedRole.includes('play')) return 'Playmaker';
    if (normalizedRole.includes('guard')) return 'Guardia';
    if (normalizedRole.includes('ala')) return 'Ala';
    if (normalizedRole.includes('centro') || normalizedRole.includes('pivot')) return 'Centro';
  }

  if (normalizedSport === 'rugby') {
    if (normalizedRole.includes('prima linea') || normalizedRole.includes('pilone')) return 'Prima linea';
    if (normalizedRole.includes('seconda linea') || normalizedRole.includes('lock')) return 'Seconda linea';
    if (normalizedRole.includes('terza linea') || normalizedRole.includes('flanker') || normalizedRole.includes('numero 8')) {
      return 'Terza linea';
    }
    if (normalizedRole.includes('mediano') || normalizedRole.includes('half')) return 'Mediani';
    if (normalizedRole.includes('trequart') || normalizedRole.includes('centre') || normalizedRole.includes('wing')) return 'Trequarti';
    if (normalizedRole.includes('estrem')) return 'Estremi';
  }

  return capitalizeRole(role);
}

function buildLocation(row?: { city?: string | null; province?: string | null; region?: string | null; country?: string | null }) {
  if (!row) return null;
  const parts = [row.city, row.province || row.region, row.country]
    .map((value) => (value || '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function groupRosterByRole(roster: RosterPlayer[], sport: string | null) {
  const normalizedSport = String(sport ?? '').trim().toLowerCase();
  const orderedGroups = SPORT_ROLE_GROUPS[normalizedSport] ?? [];
  const buckets = new Map<string, RosterPlayer[]>();

  roster.forEach((player) => {
    const group = resolveRoleGroup(normalizedSport, player.role);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(player);
  });

  const dynamicGroups = Array.from(buckets.keys());
  const preferredOrder = orderedGroups.length ? orderedGroups : dynamicGroups;
  const ordered = [...preferredOrder, ...dynamicGroups.filter((g) => !preferredOrder.includes(g))];

  return ordered
    .filter((label, index) => ordered.indexOf(label) === index)
    .map((label) => ({ label, players: buckets.get(label) ?? [] }))
    .filter((group) => group.players.length > 0);
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
  const [sport, setSport] = useState<string | null>(null);
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
          return {
            id: String(id),
            name: buildProfileDisplayName(player.full_name, player.display_name, 'Player'),
            avatarUrl: player.avatarUrl ?? player.avatar_url ?? null,
            role: player.role ?? null,
            sport: player.sport ?? null,
            location: buildLocation(player),
          } as RosterPlayer;
        })
        .filter(Boolean) as RosterPlayer[];

      setRoster(mapped);
      setSport((json as any)?.sport ?? null);
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

  const groups = useMemo(() => groupRosterByRole(roster, sport), [roster, sport]);
  const hasPlayers = groups.some((group) => group.players.length > 0);

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

      {!loadingRoster && groups.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-900">{group.label}</h2>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                  {group.players.length} player{group.players.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.players.map((player) => (
                  <RosterPlayerCard key={`${group.label}-${player.id}`} player={player} />
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
  const badge = [player.role || 'Player', player.location].filter(Boolean).join(' · ') || 'Player';
  const initials = getInitials(player.name);

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
        <p className="truncate text-sm font-semibold text-neutral-900">{player.name}</p>
        <p className="text-xs text-neutral-600">{badge}</p>
      </div>
      <Link href={`/u/${player.id}`} className="text-xs font-semibold text-[var(--brand)] hover:underline">
        Vedi profilo
      </Link>
    </div>
  );
}
