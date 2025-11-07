'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ProfileMeResponse = {
  data?: {
    id?: string;
    user_id?: string;
    full_name?: string | null;
    display_name?: string | null;
    club_name?: string | null;
    account_type?: string | null;
    avatar_url?: string | null;
  } | null;
  // tolleriamo anche formati diversi (es. { profile: {...} })
  profile?: {
    full_name?: string | null;
    display_name?: string | null;
    club_name?: string | null;
    account_type?: string | null;
    avatar_url?: string | null;
  } | null;
};

type State =
  | { loading: true; profile?: null }
  | { loading: false; profile: any | null };

export default function ProfileMiniCard() {
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          if (!cancelled) {
            setState({ loading: false, profile: null });
          }
          return;
        }

        const json: ProfileMeResponse | any = await res
          .json()
          .catch(() => ({}));

        const profile =
          json?.data ??
          json?.profile ??
          null;

        if (!cancelled) {
          setState({ loading: false, profile });
        }
      } catch {
        if (!cancelled) {
          setState({ loading: false, profile: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stato loading
  if (state.loading) {
    return (
      <div className="card">
        <div className="text-sm text-gray-500">
          Caricamento profilo…
        </div>
      </div>
    );
  }

  const profile = state.profile;

  // Nessun profilo / non loggato
  if (!profile) {
    return (
      <div className="card">
        <div className="text-xs text-gray-500 mb-1">
          Il tuo profilo
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-500">
            ?
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              Profilo incompleto
            </span>
            <Link
              href="/profile"
              className="text-xs text-blue-600 hover:underline"
            >
              Completa ora il tuo profilo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    profile.display_name ||
    profile.full_name ||
    profile.club_name ||
    'Profilo';

  const accountType =
    (profile.account_type || '')
      .toString()
      .toLowerCase();

  const badge =
    accountType.includes('club')
      ? 'CLUB'
      : accountType.includes('athlete') || accountType.includes('player')
      ? 'ATLETA'
      : null;

  const avatarUrl: string | null = profile.avatar_url || null;

  const initial =
    (displayName || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="card">
      <div className="text-xs text-gray-500 mb-1">
        Il tuo profilo
      </div>

      <Link
        href="/profile"
        className="flex items-center gap-3"
      >
        <div className="relative h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 overflow-hidden text-sm font-medium">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {displayName}
            </span>
            {badge && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                {badge}
              </span>
            )}
          </div>
          <span className="text-xs text-blue-600 hover:underline">
            Modifica profilo
          </span>
        </div>
      </Link>
    </div>
  );
}
