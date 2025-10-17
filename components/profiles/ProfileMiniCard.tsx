'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type P = {
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  birth_year?: number | null;
  city?: string | null;
  country?: string | null;
  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  avatar_url?: string | null;
  links?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    x?: string | null;
  } | null;
};

type Row = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ---------- helpers bandiera/nome paese ---------- */
function getRegionCodes(): string[] {
  try {
    // @ts-ignore
    return (Intl as any).supportedValuesOf?.('region') ?? [];
  } catch {
    return [];
  }
}
const REGION_CODES = getRegionCodes();
const DN_IT = new Intl.DisplayNames(['it'], { type: 'region' });
const DN_EN = new Intl.DisplayNames(['en'], { type: 'region' });

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB', 'u.k.': 'GB', 'united kingdom': 'GB', 'great britain': 'GB',
  usa: 'US', 'u.s.a.': 'US', 'united states': 'US', 'stati uniti': 'US',
  'czech republic': 'CZ', 'repubblica ceca': 'CZ',
  'cote d’ivoire': 'CI', "côte d’ivoire": 'CI',
  russia: 'RU', 'south korea': 'KR', 'north korea': 'KP', 'viet nam': 'VN',
};

function flagEmoji(iso2?: string | null) {
  const code = (iso2 || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  const A = 0x1f1e6, a = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + code.charCodeAt(0) - a) + String.fromCodePoint(A + code.charCodeAt(1) - a);
}

function nameToIso2(v?: string | null): string | null {
  const raw = (v || '').trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const key = raw.toLowerCase();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  for (const code of REGION_CODES) {
    const it = (DN_IT.of(code) || '').toLowerCase();
    const en = (DN_EN.of(code) || '').toLowerCase();
    if (key === it || key === en) return code as string;
  }
  return null;
}

function countryDisplay(value?: string | null): string {
  if (!value) return '';
  const iso = nameToIso2(value);
  if (iso) return `${flagEmoji(iso)} ${DN_IT.of(iso) || iso}`;
  return value;
}
/* -------------------------------------------------- */

export default function ProfileMiniCard() {
  const [p, setP] = useState<P | null>(null);
  const [place, setPlace] = useState<string>('—');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = (raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw) || {};
        setP(j || {});
        // etichetta luogo
        let label = (j?.city ?? '').trim();
        if (!label) {
          const [mun, prov, reg] = await Promise.all([
            j?.interest_municipality_id
              ? supabase.from('municipalities').select('id,name').eq('id', j.interest_municipality_id).maybeSingle()
              : Promise.resolve({ data: null }),
            j?.interest_province_id
              ? supabase.from('provinces').select('id,name').eq('id', j.interest_province_id).maybeSingle()
              : Promise.resolve({ data: null }),
            j?.interest_region_id
              ? supabase.from('regions').select('id,name').eq('id', j.interest_region_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          const m = (mun as any)?.data as Row | null;
          const pr = (prov as any)?.data as Row | null;
          const re = (reg as any)?.data as Row | null;
          label = [m?.name, pr?.name, re?.name].filter(Boolean).join(', ');
        }
        setPlace(label || '—');
      } catch {
        setP({});
      }
    })();
  }, []);

  const year = new Date().getFullYear();
  const age = p?.birth_year ? Math.max(0, year - p.birth_year) : null;
  const name = p?.full_name || p?.display_name || 'Benvenuto!';
  const nat = countryDisplay(p?.country);

  const socials = {
    instagram: p?.links?.instagram,
    facebook: p?.links?.facebook,
    tiktok: p?.links?.tiktok,
    x: p?.links?.x,
  };

  const IconWrap = ({ href, label, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-neutral-700 hover:bg-neutral-50"
    >
      {children}
    </a>
  );

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar verticale 4:5 se presente */}
        {p?.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={name}
            className="h-24 w-[4.8rem] flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="h-24 w-[4.8rem] flex-shrink-0 rounded-xl bg-gray-200" />
        )}
        <div className="min-w-0">
          <div className="text-base font-semibold">{name}</div>
          <div className="text-xs text-gray-600">{place}</div>
          {nat ? <div className="text-xs text-gray-600">{nat}</div> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Età:</span> {age ?? '—'}</div>
        <div><span className="text-gray-500">Piede:</span> {p?.foot || '—'}</div>
        <div><span className="text-gray-500">Altezza:</span> {p?.height_cm ? `${p.height_cm} cm` : '—'}</div>
        <div><span className="text-gray-500">Peso:</span> {p?.weight_kg ? `${p.weight_kg} kg` : '—'}</div>
      </div>

      {p?.bio ? <p className="mt-3 line-clamp-3 text-sm text-gray-700">{p.bio}</p> : null}

      {/* Solo icone social, più grandi */}
      {(socials.instagram || socials.facebook || socials.tiktok || socials.x) && (
        <div className="mt-3 flex items-center gap-2">
          {socials.instagram && (
            <IconWrap href={socials.instagram} label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9zm4.5-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>
            </IconWrap>
          )}
          {socials.facebook && (
            <IconWrap href={socials.facebook} label="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.4V12h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"/></svg>
            </IconWrap>
          )}
          {socials.tiktok && (
            <IconWrap href={socials.tiktok} label="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.6 2.2 2.2 4 4.3 4.7V11a8.3 8.3 0 0 1-4.3-1.3v6.1a5.9 5.9 0 1 1-5.9-5.9c.5 0 1 .1 1.5.2v2.7a3.2 3.2 0 1 0 2.2 3V3h2.2z"/></svg>
            </IconWrap>
          )}
          {socials.x && (
            <IconWrap href={socials.x} label="X">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h4.6l4.1 5.8L16.8 3H21l-7.2 9.1L21.5 21h-4.6l-4.6-6.4L7.2 21H3l7.6-9.6L3 3z"/></svg>
            </IconWrap>
          )}
        </div>
      )}

      <div className="mt-4">
        <Link href="/profile" className="inline-block rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
          Modifica profilo
        </Link>
      </div>
    </div>
  );
}
