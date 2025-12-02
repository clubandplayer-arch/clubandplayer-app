'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type FollowedProfile = {
  id: string;
  name: string;
  account_type: string | null;
  city: string | null;
  sport: string | null;
  role: string | null;
};

type ApiResponse = {
  items?: Array<{
    id: string;
    name?: string | null;
    account_type?: string | null;
    city?: string | null;
    country?: string | null;
    sport?: string | null;
    role?: string | null;
  }>;
};

type AccountType = 'club' | 'athlete';

function mapAccountType(value: string | null | undefined): AccountType {
  return value === 'club' ? 'club' : 'athlete';
}

function FollowCard({ profile, type }: { profile: FollowedProfile; type: AccountType }) {
  const href = type === 'club' ? `/c/${profile.id}` : `/u/${profile.id}`;
  const meta = [profile.city, profile.sport, profile.role].filter(Boolean).join(' · ');
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/60"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/40 text-sm font-semibold uppercase text-[var(--brand)]">
          {(profile.name || 'Profilo').substring(0, 2)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{profile.name}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{type === 'club' ? 'Club' : 'Player'}</p>
        </div>
      </div>
      {meta && <p className="text-xs text-neutral-600 dark:text-neutral-300">{meta}</p>}
    </Link>
  );
}

export default function FollowingPage() {
  const [items, setItems] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              name: row.name ?? 'Profilo',
              account_type: row.account_type ?? null,
              city: row.city ?? null,
              sport: row.sport ?? null,
              role: row.role ?? null,
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

  const clubFollows = useMemo(
    () => items.filter((p) => mapAccountType(p.account_type) === 'club'),
    [items],
  );
  const playerFollows = useMemo(
    () => items.filter((p) => mapAccountType(p.account_type) === 'athlete'),
    [items],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="heading-h1">Club &amp; Player che segui</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Una panoramica di tutti i profili che hai deciso di seguire.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-neutral-600">Caricamento…</p>}

      {!loading && items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
          Non stai seguendo nessun profilo al momento. Visita un club o un player e clicca “Segui”.
        </div>
      ) : null}

      {clubFollows.length > 0 && (
        <section className="space-y-2">
          <h2 className="heading-h2 text-xl">Club che segui</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {clubFollows.map((profile) => (
              <FollowCard key={profile.id} profile={profile} type="club" />
            ))}
          </div>
        </section>
      )}

      {playerFollows.length > 0 && (
        <section className="space-y-2">
          <h2 className="heading-h2 text-xl">Player che segui</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {playerFollows.map((profile) => (
              <FollowCard key={profile.id} profile={profile} type="athlete" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
