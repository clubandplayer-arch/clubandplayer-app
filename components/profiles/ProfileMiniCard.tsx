'use client';

import { useEffect, useState } from 'react';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  birth_year?: number | null;
  birth_place?: string | null;
  city?: string | null;
  country?: string | null;
  foot?: string | null;
  sport?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  avatar_url?: string | null;
};

type Row = { id: number; name: string };

export default function ProfileMiniCard() {
  const [p, setP] = useState<Profile | null>(null);
  const [place, setPlace] = useState<string>('—');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const raw = await r.json().catch(() => ({} as any));
        const prof: Profile =
          (raw.profile as Profile) ??
          (raw.data as Profile) ??
          (raw as Profile) ??
          {};
        setP(prof);

        // luogo: prima city, altrimenti cascade id -> label (best effort)
        if (prof.city && prof.city.trim()) {
          setPlace(prof.city.trim());
        } else if (
          prof.interest_region_id ||
          prof.interest_province_id ||
          prof.interest_municipality_id
        ) {
          try {
            const [m, pr, re] = await Promise.all([
              prof.interest_municipality_id
                ? fetch(`/api/views?type=municipality&id=${prof.interest_municipality_id}`).then(
                    (x) => x.json().catch(() => ({}))
                  )
                : null,
              prof.interest_province_id
                ? fetch(`/api/views?type=province&id=${prof.interest_province_id}`).then(
                    (x) => x.json().catch(() => ({}))
                  )
                : null,
              prof.interest_region_id
                ? fetch(`/api/views?type=region&id=${prof.interest_region_id}`).then(
                    (x) => x.json().catch(() => ({}))
                  )
                : null,
            ]);

            const mm = (m?.data as Row | undefined)?.name;
            const pp = (pr?.data as Row | undefined)?.name;
            const rr = (re?.data as Row | undefined)?.name;
            const label = [mm, pp, rr].filter(Boolean).join(', ');
            setPlace(label || '—');
          } catch {
            setPlace('—');
          }
        } else {
          setPlace('—');
        }
      } catch {
        setP({});
        setPlace('—');
      }
    })();
  }, []);

  const name =
    (p?.full_name || p?.display_name || '').trim() || 'Completa il tuo profilo';
  const year = new Date().getFullYear();
  const age = p?.birth_year ? Math.max(0, year - p.birth_year) : null;

  const footLabel = formatFoot(p?.foot);
  const sportLabel = formatSport(p?.sport);

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {p?.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={name}
            className="h-28 w-24 flex-shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="h-28 w-24 flex-shrink-0 rounded-2xl bg-gray-200" />
        )}

        <div className="min-w-0">
          <div className="text-lg font-semibold text-gray-900">
            {name}
          </div>

          {place && (
            <div className="text-sm text-gray-600">
              Luogo di residenza:{' '}
              <span className="font-normal">{place}</span>
            </div>
          )}

          {p?.birth_place && (
            <div className="text-sm text-gray-600">
              Luogo di nascita:{' '}
              <span className="font-normal">
                {p.birth_place}
              </span>
            </div>
          )}

          {p?.country && (
            <div className="text-sm text-gray-600">
              Nazionalità:{' '}
              <span className="font-normal">
                {p.country}
              </span>
            </div>
          )}

          {sportLabel && (
            <div className="text-sm text-gray-600">
              Sport principale:{' '}
              <span className="font-normal">{sportLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Età:</span>{' '}
          <span className="font-medium text-gray-800">
            {age ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Lato dominante:</span>{' '}
          <span className="font-medium text-gray-800">
            {footLabel || '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Altezza:</span>{' '}
          <span className="font-medium text-gray-800">
            {p?.height_cm ? `${p.height_cm} cm` : '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Peso:</span>{' '}
          <span className="font-medium text-gray-800">
            {p?.weight_kg ? `${p.weight_kg} kg` : '—'}
          </span>
        </div>
      </div>

      {p?.bio && (
        <p className="mt-4 line-clamp-4 text-sm text-gray-700 leading-relaxed">
          {p.bio}
        </p>
      )}
    </div>
  );
}

function formatFoot(value?: string | null) {
  const raw = (value ?? '').toString().toLowerCase();
  if (!raw) return '';
  if (['right'].includes(raw)) return 'Destro';
  if (['left'].includes(raw)) return 'Sinistro';
  if (['both'].includes(raw)) return 'Ambidestro';
  return '';
}

function formatSport(slug?: string | null) {
  if (!slug) return '';
  return slug
    .replace(/_/g, ' ')
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
