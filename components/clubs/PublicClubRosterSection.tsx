"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { buildProfileDisplayName } from '@/lib/displayName';
import { normalizeSport, SPORTS_ROLES, STAFF_ROLES } from '@/lib/opps/constants';

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

type PublicStaffMember = {
  id: string;
  profileId: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  staffRole: string | null;
  profileRole: string | null;
  location: {
    city: string | null;
    province: string | null;
    region: string | null;
    country: string | null;
  };
  sport: string | null;
  certified: boolean | null;
  bio: string | null;
};

type PublicStaffResponse = {
  ok?: boolean;
  staff?: PublicStaffMember[];
};

type Props = {
  clubId: string;
  clubSport?: string | null;
  clubCity?: string | null;
};

type ActiveTab = 'roster' | 'staff';

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

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function compareNames(a: string, b: string) {
  return a
    .trim()
    .toLocaleLowerCase('it')
    .localeCompare(b.trim().toLocaleLowerCase('it'), 'it', { sensitivity: 'base' });
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

function StaffCard({ member, fallbackCity }: { member: PublicStaffMember; fallbackCity?: string | null }) {
  const displayName = buildProfileDisplayName(member.fullName, member.displayName, 'Staff');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const rawCountry = (member.location.country ?? '').trim();
  const matchCountry = rawCountry.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  const iso2 = matchCountry ? matchCountry[1].trim().toUpperCase() : null;
  const countryLabel = (matchCountry ? matchCountry[2]?.trim() || iso2 || '' : rawCountry) || '';
  const roleLabel = member.staffRole || member.profileRole;
  const cityLabel = member.location.city || fallbackCity || member.location.province || member.location.region;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm">
      <Link href={`/u/${member.profileId}`} className="group flex min-w-0 flex-1 items-start gap-3">
        {member.avatarUrl ? (
          <Image
            src={member.avatarUrl}
            alt={displayName}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-semibold text-fuchsia-700">
            {initials || '—'}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-neutral-900 transition group-hover:text-pink-700">
            {displayName}
          </p>
          {roleLabel ? <p className="text-xs text-neutral-600">{roleLabel}</p> : null}
          {cityLabel ? <p className="text-xs text-neutral-600">{cityLabel}</p> : null}
          {countryLabel ? (
            <p className="flex items-center gap-1 text-xs text-neutral-600">
              {iso2 ? <CountryFlag iso2={iso2} /> : null}
              <span>{countryLabel}</span>
            </p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

function ListSkeleton() {
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

export default function PublicClubRosterSection({ clubId, clubSport, clubCity }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('roster');

  const [rosterLoading, setRosterLoading] = useState(true);
  const [players, setPlayers] = useState<PublicRosterPlayer[]>([]);
  const [rosterError, setRosterError] = useState(false);

  const [staffLoading, setStaffLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<PublicStaffMember[]>([]);
  const [staffError, setStaffError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadData() {
      setRosterLoading(true);
      setStaffLoading(true);

      const [rosterResult, staffResult] = await Promise.allSettled([
        fetch(`/api/clubs/${clubId}/roster`, { cache: 'no-store', signal: controller.signal }),
        fetch(`/api/clubs/${clubId}/staff`, { cache: 'no-store', signal: controller.signal }),
      ]);

      if (cancelled) return;

      if (rosterResult.status === 'fulfilled' && rosterResult.value.ok) {
        const data = (await rosterResult.value.json().catch(() => ({}))) as PublicRosterResponse;
        setPlayers(Array.isArray(data.roster) ? data.roster : []);
        setRosterError(false);
      } else {
        setPlayers([]);
        setRosterError(true);
      }

      if (staffResult.status === 'fulfilled' && staffResult.value.ok) {
        const data = (await staffResult.value.json().catch(() => ({}))) as PublicStaffResponse;
        setStaffMembers(Array.isArray(data.staff) ? data.staff : []);
        setStaffError(false);
      } else {
        setStaffMembers([]);
        setStaffError(true);
      }

      setRosterLoading(false);
      setStaffLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clubId]);

  const isRosterTab = activeTab === 'roster';
  const sortedPlayers = useMemo(() => {
    const roleList = SPORTS_ROLES[normalizeSport(clubSport) ?? ''] ?? [];
    const roleIndex = new Map(roleList.map((role, index) => [normalizeKey(role), index]));
    return [...players].sort((a, b) => {
      const aIdx = roleIndex.get(normalizeKey(a.role ?? '')) ?? 9999;
      const bIdx = roleIndex.get(normalizeKey(b.role ?? '')) ?? 9999;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return compareNames(
        buildProfileDisplayName(a.full_name, a.display_name, 'Profilo'),
        buildProfileDisplayName(b.full_name, b.display_name, 'Profilo'),
      );
    });
  }, [clubSport, players]);

  const sortedStaff = useMemo(() => {
    const roleIndex = new Map(STAFF_ROLES.map((role, index) => [normalizeKey(role), index]));
    return [...staffMembers].sort((a, b) => {
      const aIdx = roleIndex.get(normalizeKey(a.staffRole ?? a.profileRole ?? '')) ?? 9999;
      const bIdx = roleIndex.get(normalizeKey(b.staffRole ?? b.profileRole ?? '')) ?? 9999;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return compareNames(
        buildProfileDisplayName(a.fullName, a.displayName, 'Staff'),
        buildProfileDisplayName(b.fullName, b.displayName, 'Staff'),
      );
    });
  }, [staffMembers]);

  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="heading-h2 text-xl">Rosa e Staff</h2>
        <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isRosterTab ? 'bg-white text-pink-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
            aria-pressed={isRosterTab}
          >
            Rosa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              !isRosterTab ? 'bg-white text-pink-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
            aria-pressed={!isRosterTab}
          >
            Staff
          </button>
        </div>
      </div>

      {isRosterTab ? (
        <>
          <p className="text-sm text-neutral-600">Giocatori in rosa</p>
          {rosterLoading ? (
            <div className="space-y-2">
              <ListSkeleton />
              <ListSkeleton />
            </div>
          ) : null}

          {!rosterLoading && (!players.length || rosterError) ? (
            <p className="text-sm text-neutral-600">Nessun giocatore in rosa.</p>
          ) : null}

          {!rosterLoading && sortedPlayers.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedPlayers.map((player) => (
                <RosterCard key={player.player_id} player={player} />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-600">Membri staff del club</p>
          {staffLoading ? (
            <div className="space-y-2">
              <ListSkeleton />
              <ListSkeleton />
            </div>
          ) : null}

          {!staffLoading && (!staffMembers.length || staffError) ? (
            <p className="text-sm text-neutral-600">Nessun membro dello staff ancora aggiunto.</p>
          ) : null}

          {!staffLoading && sortedStaff.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedStaff.map((member) => (
                <StaffCard key={member.id} member={member} fallbackCity={clubCity} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
