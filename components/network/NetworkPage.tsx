'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import FollowButton from '@/components/common/FollowButton';

type AccountType = 'club' | 'athlete';

type NetworkProfile = {
  id: string;
  name: string;
  accountType: AccountType;
  city: string | null;
  country: string | null;
  sport: string | null;
  role: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
};

type TabKey = 'suggested' | 'following' | 'followers';
type FilterType = 'all' | 'club' | 'athlete';

type ApiResponse = { items?: any[]; role?: string; targetType?: string };

const tabs: { key: TabKey; label: string }[] = [
  { key: 'suggested', label: 'Suggeriti' },
  { key: 'following', label: 'Segui' },
  { key: 'followers', label: 'Seguaci' },
];

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tutti' },
  { key: 'club', label: 'Club' },
  { key: 'athlete', label: 'Player' },
];

function avatarSrc(name: string, url?: string | null) {
  if (url) return url;
  const seed = encodeURIComponent(name || 'Profilo');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}

function profileHref(id: string, type: AccountType) {
  return type === 'club' ? `/clubs/${id}` : `/athletes/${id}`;
}

function subtitle(profile: NetworkProfile) {
  const meta = [profile.role, profile.sport].filter(Boolean).join(' · ');
  const place = [profile.city, profile.country].filter(Boolean).join(', ');
  return meta || place || '—';
}

function AccountBadge({ type }: { type: AccountType }) {
  return (
    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-700">
      {type === 'club' ? 'Club' : 'Player'}
    </span>
  );
}

function ProfileCard({
  profile,
  onFollowChange,
}: {
  profile: NetworkProfile;
  onFollowChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc(profile.name, profile.avatarUrl)}
          alt={profile.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Link href={profileHref(profile.id, profile.accountType)} className="text-sm font-semibold text-neutral-900 hover:underline dark:text-white">
            {profile.name}
          </Link>
          <AccountBadge type={profile.accountType} />
        </div>
        <div className="truncate text-sm text-neutral-600 dark:text-neutral-300">{subtitle(profile)}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{[profile.city, profile.country].filter(Boolean).join(', ') || '—'}</div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <FollowButton
          targetId={profile.id}
          targetType={profile.accountType}
          targetName={profile.name}
          size="md"
          onChange={onFollowChange}
        />
        <Link
          href={profileHref(profile.id, profile.accountType)}
          className="text-xs font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300"
        >
          Visita profilo
        </Link>
      </div>
    </div>
  );
}

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('suggested');
  const [loaded, setLoaded] = useState<Record<TabKey, boolean>>({
    suggested: false,
    following: false,
    followers: false,
  });
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    suggested: false,
    following: false,
    followers: false,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    suggested: null,
    following: null,
    followers: null,
  });
  const [suggestions, setSuggestions] = useState<NetworkProfile[]>([]);
  const [following, setFollowing] = useState<NetworkProfile[]>([]);
  const [followers, setFollowers] = useState<NetworkProfile[]>([]);
  const [followingFilter, setFollowingFilter] = useState<FilterType>('all');

  const filteredFollowing = useMemo(() => {
    if (followingFilter === 'all') return following;
    return following.filter((p) => p.accountType === followingFilter);
  }, [following, followingFilter]);

  async function loadSuggestions() {
    setLoading((prev) => ({ ...prev, suggested: true }));
    setErrors((prev) => ({ ...prev, suggested: null }));
    try {
      const res = await fetch('/api/follows/suggestions?limit=20', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      const targetType = data?.targetType === 'athlete' ? 'athlete' : 'club';
      const items: NetworkProfile[] = Array.isArray(data?.items)
        ? data.items.map((p: any) => ({
            id: p.id,
            name: p.name ?? 'Profilo',
            accountType: targetType,
            city: p.city ?? null,
            country: p.country ?? null,
            sport: p.sport ?? null,
            role: p.role ?? null,
            avatarUrl: p.avatar_url ?? null,
            isFollowing: false,
          }))
        : [];
      setSuggestions(items);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, suggested: err?.message || 'Errore nel caricare i suggerimenti' }));
    } finally {
      setLoading((prev) => ({ ...prev, suggested: false }));
      setLoaded((prev) => ({ ...prev, suggested: true }));
    }
  }

  async function loadFollowing() {
    setLoading((prev) => ({ ...prev, following: true }));
    setErrors((prev) => ({ ...prev, following: null }));
    try {
      const res = await fetch('/api/follows/list', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      const items: NetworkProfile[] = Array.isArray(data?.items)
        ? data.items.map((p: any) => ({
            id: p.id,
            name: p.name ?? 'Profilo',
            accountType: p.accountType === 'club' ? 'club' : 'athlete',
            city: p.city ?? null,
            country: p.country ?? null,
            sport: p.sport ?? null,
            role: p.role ?? null,
            avatarUrl: p.avatarUrl ?? null,
            isFollowing: true,
          }))
        : [];
      setFollowing(items);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, following: err?.message || 'Errore nel caricare chi segui' }));
    } finally {
      setLoading((prev) => ({ ...prev, following: false }));
      setLoaded((prev) => ({ ...prev, following: true }));
    }
  }

  async function loadFollowers() {
    setLoading((prev) => ({ ...prev, followers: true }));
    setErrors((prev) => ({ ...prev, followers: null }));
    try {
      const res = await fetch('/api/follows/followers', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      const items: NetworkProfile[] = Array.isArray(data?.items)
        ? data.items.map((p: any) => ({
            id: p.id,
            name: p.name ?? 'Profilo',
            accountType: p.accountType === 'club' ? 'club' : 'athlete',
            city: p.city ?? null,
            country: p.country ?? null,
            sport: p.sport ?? null,
            role: p.role ?? null,
            avatarUrl: p.avatarUrl ?? null,
            isFollowing: Boolean(p.isFollowing),
          }))
        : [];
      setFollowers(items);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, followers: err?.message || 'Errore nel caricare i tuoi seguaci' }));
    } finally {
      setLoading((prev) => ({ ...prev, followers: false }));
      setLoaded((prev) => ({ ...prev, followers: true }));
    }
  }

  useEffect(() => {
    void loadSuggestions();
  }, []);

  useEffect(() => {
    if (activeTab === 'following' && !loaded.following) {
      void loadFollowing();
    }
    if (activeTab === 'followers' && !loaded.followers) {
      void loadFollowers();
    }
  }, [activeTab, loaded.followers, loaded.following]);

  const emptyState = (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
      Nessun risultato da mostrare.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="heading-h1 text-2xl font-semibold text-neutral-900 dark:text-white">La tua rete</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Gestisci i suggerimenti, i profili che segui e chi ti segue, in stile "La mia rete" di LinkedIn.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700 dark:hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'suggested' && (
        <section className="space-y-4">
          {errors.suggested && <p className="text-sm text-red-600">{errors.suggested}</p>}
          {loading.suggested && <p className="text-sm text-neutral-600">Caricamento suggerimenti…</p>}
          {!loading.suggested && suggestions.length === 0 ? (
            emptyState
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onFollowChange={(next) => {
                    if (next) {
                      setSuggestions((prev) => prev.filter((p) => p.id !== profile.id));
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'following' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFollowingFilter(f.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  followingFilter === f.key
                    ? 'bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900'
                    : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700 dark:hover:bg-neutral-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {errors.following && <p className="text-sm text-red-600">{errors.following}</p>}
          {loading.following && <p className="text-sm text-neutral-600">Caricamento profili che segui…</p>}
          {!loading.following && filteredFollowing.length === 0 ? (
            emptyState
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredFollowing.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onFollowChange={(next) => {
                    if (!next) {
                      setFollowing((prev) => prev.filter((p) => p.id !== profile.id));
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'followers' && (
        <section className="space-y-4">
          {errors.followers && <p className="text-sm text-red-600">{errors.followers}</p>}
          {loading.followers && <p className="text-sm text-neutral-600">Caricamento seguaci…</p>}
          {!loading.followers && followers.length === 0 ? (
            emptyState
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {followers.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onFollowChange={(next) =>
                    setFollowers((prev) =>
                      prev.map((p) => (p.id === profile.id ? { ...p, isFollowing: next } : p)),
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
