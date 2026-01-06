/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import FollowButton from '@/components/common/FollowButton';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';

type Suggestion = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  type?: string | null;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

function detailLine(suggestion: Suggestion, viewerRole: ProfileRole) {
  const location = [suggestion.city, suggestion.country].filter(Boolean).join(', ');
  const sportRole = [suggestion.role, suggestion.sport].filter(Boolean).join(' · ');

  if (viewerRole === 'club') {
    return sportRole || location;
  }
  return location || sportRole;
}

export default function WhoToFollow() {
  const { role: contextRole } = useCurrentProfileContext();
  const [role, setRole] = useState<ProfileRole>('guest');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/suggestions/who-to-follow?limit=5', {
          credentials: 'include',
          cache: 'no-store',
          next: { revalidate: 0 },
        });
        const data = await res.json().catch(() => ({}));
        const suggestions = Array.isArray(data?.suggestions)
          ? (data.suggestions as Suggestion[])
          : Array.isArray(data?.data)
          ? (data.data as Suggestion[])
          : [];
        setRole(contextRole || 'guest');
        setItems(suggestions);
        setError(res.ok ? null : 'Impossibile caricare i suggerimenti.');
      } catch {
        setItems([]);
        setRole(contextRole || 'guest');
        setError('Impossibile caricare i suggerimenti.');
      } finally {
        setLoading(false);
      }
    })();
  }, [contextRole]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Chi seguire</div>
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1">
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const heading = 'Chi seguire';
  const subtitle = role === 'club' ? 'Player nella tua zona' : 'Club nella tua zona';

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{heading}</div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
      {error ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          {error}
        </div>
      ) : items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              {(() => {
                const name = it.display_name || it.full_name || 'Profilo';
                return (
              <img
                src={
                      it.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
                }
                    alt={name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              />
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.display_name || it.full_name || 'Profilo'}</div>
                <div className="truncate text-xs text-zinc-500">
                  {detailLine(it, role) || '—'}
                </div>
              </div>

              <FollowButton
                targetProfileId={it.id}
                size="sm"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Nessun suggerimento al momento.
        </div>
      )}
    </div>
  );
}
