'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/common/FollowButton';
import CertifiedCMarkFollowing from '@/components/badges/CertifiedCMarkFollowing';
import { CountryFlag } from '@/components/ui/CountryFlag';
import useIsClub from '@/hooks/useIsClub';
import { buildProfileDisplayName } from '@/lib/displayName';

type FollowedProfile = {
  id: string;
  name: string;
  account_type: string | null;
  type?: string | null;
  avatar_url?: string | null;
  city: string | null;
  country: string | null;
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
type TabKey = 'club' | 'player';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'club', label: 'Club' },
  { key: 'player', label: 'Player' },
];

function mapAccountType(value: string | null | undefined): AccountType {
  return value === 'club' ? 'club' : 'athlete';
}

function normalizeRoleLabel(value: string | null | undefined): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized === 'athlete' || normalized === 'player' || normalized === 'club') return null;
  return text;
}

function getInitials(value: string) {
  const clean = value.trim();
  if (!clean) return 'PR';
  const parts = clean.split(' ').filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function extractIso2(text?: string | null) {
  const raw = (text ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/([A-Za-z]{2})\s*$/);
  return match ? match[1].toUpperCase() : null;
}

function getCountryLabel(text?: string | null, iso2?: string | null) {
  const raw = (text ?? '').trim();
  if (!raw) return iso2 ?? '';
  const match = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  if (match) {
    return match[2]?.trim() || match[1].toUpperCase();
  }
  return raw;
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
  const href = type === 'club' ? `/clubs/${profile.id}` : `/players/${profile.id}`;
  const meta = [profile.city, profile.sport, normalizeRoleLabel(profile.role)].filter(Boolean).join(' · ');
  const playerIso2 = type === 'athlete' ? extractIso2(profile.country) : null;
  const playerCountryLabel = type === 'athlete' ? getCountryLabel(profile.country, playerIso2) : '';
  const initials = getInitials(profile.name || 'Profilo');
  const toggleDisabled = rosterPending || !onToggleRoster;
  const avatarUrl = profile.avatar_url ? profile.avatar_url.trim() : '';
  const isCertified = type === 'club' && Boolean((profile as any).is_verified ?? (profile as any).isVerified ?? false);
  const logoSizePx = 48;
  const feedLogoSizePx = 140;
  const feedCSizePx = 40;
  const feedOffsetPx = 8;
  const cSizePx = Math.round(logoSizePx * (feedCSizePx / feedLogoSizePx) * 1.15);
  const offsetPx = Math.max(1, Math.round(logoSizePx * (feedOffsetPx / feedLogoSizePx) * 0.6));

  const handleToggle = () => {
    if (!onToggleRoster || toggleDisabled) return;
    onToggleRoster(profile.id, !inRoster);
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex flex-wrap items-start gap-3">
        <Link href={href} className="flex flex-1 gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/40 text-sm font-semibold uppercase text-[var(--brand)] aspect-square">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.name || 'Profilo'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {isCertified ? (
              <span className="absolute" style={{ width: cSizePx, height: cSizePx, right: -offsetPx, top: -offsetPx }}>
                <CertifiedCMarkFollowing className="h-full w-full [&_svg]:h-full [&_svg]:w-full" />
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <p className="break-words text-sm font-semibold leading-tight text-neutral-900 dark:text-white">{profile.name}</p>
            </div>
            {type === 'athlete' && (playerIso2 || playerCountryLabel) ? (
              <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                {playerIso2 ? <CountryFlag iso2={playerIso2} /> : null}
                <span>{playerCountryLabel}</span>
              </div>
            ) : null}
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
  const [activeTab, setActiveTab] = useState<TabKey>('club');
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
              country: row.country ?? null,
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
  const activeItems = useMemo(
    () => (activeTab === 'club' ? clubFollows : playerFollows),
    [activeTab, clubFollows, playerFollows],
  );
  const showRosterControls = isClub && !roleLoading;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="heading-h1">Club &amp; Player che segui</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Una panoramica di tutti i profili che hai deciso di seguire. {showRosterControls ? 'Come club puoi usare il toggle “In Rosa” per attivare la rosa dei player.' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
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

      {!loading && !error && items.length > 0 && activeItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
          {activeTab === 'club'
            ? 'Non stai seguendo nessun club al momento.'
            : 'Non stai seguendo nessun player al momento.'}
        </div>
      ) : null}

      {activeItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {activeItems.map((profile) => {
            const type: AccountType = activeTab === 'club' ? 'club' : 'athlete';
            return (
              <FollowCard
                key={profile.id}
                profile={profile}
                type={type}
                showRosterToggle={showRosterControls}
                inRoster={rosterIds.has(profile.id)}
                rosterPending={pendingRoster.has(profile.id)}
                onToggleRoster={showRosterControls ? handleToggleRoster : undefined}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
